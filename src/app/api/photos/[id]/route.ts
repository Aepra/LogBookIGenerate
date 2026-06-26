import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserIdByEmail } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const userId = await getUserIdByEmail(session.user.email);

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ── Step 1: Get photo + verify ownership ──
    const { data: photo } = await supabaseAdmin
      .from("photos")
      .select("id, google_file_id, activity_id")
      .eq("id", id)
      .single();

    if (!photo) {
      return NextResponse.json({ error: "Foto tidak ditemukan." }, { status: 404 });
    }

    // Verify ownership via activity → logbook chain
    const { data: activity } = await supabaseAdmin
      .from("activities")
      .select("logbook_id")
      .eq("id", photo.activity_id)
      .single();

    if (!activity) {
      return NextResponse.json({ error: "Activity tidak ditemukan." }, { status: 404 });
    }

    const { data: logbook } = await supabaseAdmin
      .from("logbooks")
      .select("id")
      .eq("id", activity.logbook_id)
      .eq("user_id", userId)
      .single();

    if (!logbook) {
      return NextResponse.json({ error: "Anda tidak memiliki akses ke foto ini." }, { status: 403 });
    }

    // ── Step 2: Delete file from Google Drive (best effort, non-blocking) ──
    if (photo.google_file_id && session.accessToken) {
      try {
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${photo.google_file_id}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.accessToken}` },
          }
        );
      } catch {
        // Drive cleanup is best-effort — DB delete proceeds regardless
      }
    }

    // ── Step 3: Delete DB record ──
    const { error: deleteError } = await supabaseAdmin
      .from("photos")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: `Gagal menghapus foto: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE PHOTO]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}