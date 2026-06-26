import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { updateActivity } from "@/services/activity.service";
import { getUserIdByEmail } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase-server";
import { invalidateExportCache } from "@/lib/invalidateExportCache";

export async function GET(
  _request: NextRequest,
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

    const { data: activity } = await supabaseAdmin
      .from("activities")
      .select("*")
      .eq("id", id)
      .single();

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    // Verify ownership through logbook
    const { data: logbook } = await supabaseAdmin
      .from("logbooks")
      .select("id")
      .eq("id", activity.logbook_id)
      .eq("user_id", userId)
      .single();

    if (!logbook) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ activity });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[GET ACTIVITY]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(
  request: NextRequest,
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

    const body = await request.json();
    const { activity_date, start_time, end_time, title, description, obstacle } = body;

    const activity = await updateActivity(id, userId, {
      activity_date,
      start_time,
      end_time,
      title,
      description,
      obstacle,
    });

    // Invalidate export cache since data changed
    if (activity?.logbook_id) {
      invalidateExportCache(activity.logbook_id);
    }

    return NextResponse.json({ activity });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[UPDATE ACTIVITY]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
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

    // Verify ownership through logbook
    const { data: activity } = await supabaseAdmin
      .from("activities")
      .select("logbook_id")
      .eq("id", id)
      .single();

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const { data: logbook } = await supabaseAdmin
      .from("logbooks")
      .select("id")
      .eq("id", activity.logbook_id)
      .eq("user_id", userId)
      .single();

    if (!logbook) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete photos first
    await supabaseAdmin.from("photos").delete().eq("activity_id", id);

    // Delete activity
    const { error } = await supabaseAdmin
      .from("activities")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Gagal menghapus aktivitas: ${error.message}`);
    }

    // Invalidate export cache since data changed
    invalidateExportCache(activity.logbook_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[DELETE ACTIVITY]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
