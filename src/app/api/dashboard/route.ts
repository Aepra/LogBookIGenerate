import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserIdByEmail } from "@/lib/user";
import { getTotalLogbooks, getRecentLogbooks } from "@/services/logbook.service";
import { getTotalActivities, getTotalDaysAll, getTotalPhotosAll, getRecentActivities } from "@/services/activity.service";

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

    const [totalLogbooks, totalDays, totalActivities, totalPhotos, recentLogbooks, recentActivities] = await Promise.all([
      getTotalLogbooks(userId),
      getTotalDaysAll(userId),
      getTotalActivities(),
      getTotalPhotosAll(userId),
      getRecentLogbooks(userId, 5),
      getRecentActivities(userId, 10),
    ]);

    return NextResponse.json({
      stats: {
        totalLogbooks,
        totalDays,
        totalActivities,
        totalPhotos,
      },
      recentLogbooks,
      recentActivities,
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}