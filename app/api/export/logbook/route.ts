import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserIdByEmail } from "@/lib/user";
import { exportLogbookToGoogleDocs } from "@/services/export.service";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { logbook_id } = body;

    if (!logbook_id) {
      return NextResponse.json(
        { error: "logbook_id is required" },
        { status: 400 }
      );
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get access token from session
    const accessToken = (session as unknown as { accessToken?: string }).accessToken;
    const accessTokenExpires = (session as unknown as { accessTokenExpires?: number }).accessTokenExpires;
    const isTokenStale = accessTokenExpires && Date.now() >= accessTokenExpires;
    const hasRefreshToken = !!((session as unknown as { refreshToken?: string }).refreshToken);

    console.log("[EXPORT] accessToken:", !!accessToken, "stale:", isTokenStale, "hasRefresh:", hasRefreshToken);

    if (!accessToken) {
      console.error("[EXPORT] FAIL: no access token");
      return NextResponse.json(
        {
          error: "Sesi Google Drive telah berakhir. Silakan logout dan login ulang.",
          code: "NO_ACCESS_TOKEN",
        },
        { status: 401 }
      );
    }

    if (isTokenStale && !hasRefreshToken) {
      console.error("[EXPORT] FAIL: token expired, no refresh");
      return NextResponse.json(
        {
          error: "Sesi Google Drive telah berakhir. Silakan logout dan login ulang.",
          code: "TOKEN_EXPIRED_NO_REFRESH",
        },
        { status: 401 }
      );
    }

    // Delegate to export service — no business logic here
    const result = await exportLogbookToGoogleDocs(
      logbook_id,
      userId,
      accessToken
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Export gagal" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: result.url,
      message: "Logbook berhasil diexport ke Google Docs.",
    });
  } catch (error) {
    console.error("POST /api/export/logbook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}