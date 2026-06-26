import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserIdByEmail, updateUserProfile } from "@/lib/user";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, nim, university, faculty, study_program, batch_year } = body;

    const updated = await updateUserProfile(userId, {
      name: name || undefined,
      nim: nim || undefined,
      university: university || undefined,
      faculty: faculty || undefined,
      study_program: study_program || undefined,
      batch_year: batch_year ? parseInt(batch_year) : undefined,
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("[API User Update]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}