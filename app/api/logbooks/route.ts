import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createLogbook, getUserLogbooks } from "@/services/logbook.service";
import { getUserIdByEmail } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = await getUserIdByEmail(session.user.email);

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const logbooks = await getUserLogbooks(userId);
    return NextResponse.json({ logbooks });
  } catch (error) {
    console.error("GET /api/logbooks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, type } = body;

    // Validasi input
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!type || !["pkl", "kkn", "other"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be pkl, kkn, or other" },
        { status: 400 }
      );
    }

    const userId = await getUserIdByEmail(session.user.email);

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get Drive access token and user root folder ID for Drive integration
    const accessToken = (session as unknown as { accessToken?: string }).accessToken;
    let userRootFolderId: string | null = null;

    if (accessToken) {
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("drive_folder_id")
        .eq("id", userId)
        .single();

      userRootFolderId = userData?.drive_folder_id || null;
    }

    const logbook = await createLogbook(
      userId,
      {
        title: title.trim(),
        description: description?.trim() || "",
        type,
      },
      accessToken,
      userRootFolderId
    );

    return NextResponse.json({ logbook }, { status: 201 });
  } catch (error) {
    console.error("POST /api/logbooks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}