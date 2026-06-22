import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { updateActivity } from "@/services/activity.service";
import { getUserIdByEmail } from "@/lib/user";

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

    return NextResponse.json({ activity });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[UPDATE ACTIVITY]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}