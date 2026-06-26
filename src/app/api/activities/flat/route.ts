import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getActivitiesByLogbookId } from "@/services/activity.service";
import { getUserIdByEmail } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const logbookId = searchParams.get("logbook_id");

    if (!logbookId) {
      return NextResponse.json(
        { error: "logbook_id is required" },
        { status: 400 }
      );
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify user owns this logbook
    const { data: logbook } = await supabaseAdmin
      .from("logbooks")
      .select("id")
      .eq("id", logbookId)
      .eq("user_id", userId)
      .single();

    if (!logbook) {
      return NextResponse.json(
        { error: "Logbook not found" },
        { status: 404 }
      );
    }

    const activities = await getActivitiesByLogbookId(logbookId);
    return NextResponse.json({ activities });
  } catch (error) {
    console.error("GET /api/activities/flat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}