
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { updateLogbook } from "@/services/logbook.service";
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
    const { title, description, type, status, location, institution_name, supervisor_name, mentor_name, start_date, end_date } = body;

    const logbook = await updateLogbook(id, userId, {
      title,
      description,
      type,
      status,
      location,
      institution_name,
      supervisor_name,
      mentor_name,
      start_date,
      end_date,
    });

    return NextResponse.json({ logbook });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[UPDATE LOGBOOK]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}