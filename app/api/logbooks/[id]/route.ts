import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getLogbookById } from "@/services/logbook.service";
import { getUserIdByEmail } from "@/lib/user";

export async function GET(
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

    const logbook = await getLogbookById(id, userId);

    if (!logbook) {
      return NextResponse.json(
        { error: "Logbook not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ logbook });
  } catch (error) {
    console.error("GET /api/logbooks/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}