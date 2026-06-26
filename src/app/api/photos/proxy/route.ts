/**
 * GET /api/photos/proxy?fileId=xxx
 *
 * Proxies image files from Google Drive through the server.
 * Uses the user's session access token to authenticate to Drive API.
 * This avoids:
 *   - Public permission requirements ("Anyone with link")
 *   - Google's virus scan warning page on uc?export=view
 *   - The placeholder issue with drive.google.com/thumbnail
 *
 * Flow:
 *   Client → /api/photos/proxy?fileId=xxx → Drive API (authenticated) → binary image → Client
 */

import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getUserIdByEmail } from "@/lib/user";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const fileId = request.nextUrl.searchParams.get("fileId");
  const activityId = request.nextUrl.searchParams.get("activity_id");

  // ── Mode 1: List photos by activity_id ──
  if (activityId) {
    // Verify ownership
    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: activity } = await supabaseAdmin
      .from("activities")
      .select("logbook_id")
      .eq("id", activityId)
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
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch photos
    const { data: photos } = await supabaseAdmin
      .from("photos")
      .select("*")
      .eq("activity_id", activityId)
      .order("created_at", { ascending: true });

    return NextResponse.json({ photos: photos || [] });
  }

  // ── Mode 2: Proxy image by fileId (existing behavior) ──
  if (!fileId) {
    return new NextResponse("Missing fileId or activity_id", { status: 400 });
  }

  try {
    // Step 1: Get file metadata to know the MIME type
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType,size`,
      {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      }
    );

    if (!metaRes.ok) {
      console.error("[PHOTO PROXY] metadata fetch failed", { fileId, status: metaRes.status });
      return new NextResponse("File not found or access denied", { status: 404 });
    }

    const meta = await metaRes.json();
    const mimeType: string = meta.mimeType || "image/jpeg";
    const fileSize: number = meta.size || 0;

    // Reject non-image files
    if (!mimeType.startsWith("image/")) {
      return new NextResponse("Not an image", { status: 400 });
    }

    // Reject files larger than 10MB (proxy safety limit)
    if (fileSize > 10 * 1024 * 1024) {
      return new NextResponse("File too large", { status: 413 });
    }

    // Step 2: Download the file content with authorization
    const downloadRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      }
    );

    if (!downloadRes.ok) {
      console.error("[PHOTO PROXY] download failed", { fileId, status: downloadRes.status });
      return new NextResponse("Download failed", { status: 502 });
    }

    // Step 3: Stream the binary directly to client without buffering
    return new Response(downloadRes.body, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[PHOTO PROXY] unexpected error", { fileId, error: String(err) });
    return new NextResponse("Internal server error", { status: 500 });
  }
}
