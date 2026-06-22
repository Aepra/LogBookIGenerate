import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createActivity, getActivitiesGroupedByDate } from "@/services/activity.service";
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

    const groupedActivities = await getActivitiesGroupedByDate(logbookId);
    return NextResponse.json({ activities: groupedActivities });
  } catch (error) {
    console.error("GET /api/activities error:", error);
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
    const { logbook_id, activity_date, start_time, end_time, title, description, obstacle } = body;

    if (!logbook_id) {
      return NextResponse.json(
        { error: "logbook_id is required" },
        { status: 400 }
      );
    }

    if (!activity_date) {
      return NextResponse.json(
        { error: "activity_date is required" },
        { status: 400 }
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
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
      .eq("id", logbook_id)
      .eq("user_id", userId)
      .single();

    if (!logbook) {
      return NextResponse.json(
        { error: "Logbook not found" },
        { status: 404 }
      );
    }

    const activity = await createActivity({
      logbook_id,
      activity_date,
      start_time: start_time || null,
      end_time: end_time || null,
      title: title.trim(),
      description: description?.trim() || "",
      obstacle: obstacle?.trim() || "",
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("POST /api/activities error:", error);

    // Return validation errors with 400 status
    if (
      message.includes("activity_date") ||
      message.includes("Jam selesai") ||
      message.includes("Format waktu")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}