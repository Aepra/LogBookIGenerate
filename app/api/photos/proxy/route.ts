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

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const fileId = request.nextUrl.searchParams.get("fileId");
  if (!fileId) {
    return new NextResponse("Missing fileId", { status: 400 });
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

    // Step 3: Return the raw binary with correct MIME type and cache headers
    const buffer = await downloadRes.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[PHOTO PROXY] unexpected error", { fileId, error: String(err) });
    return new NextResponse("Internal server error", { status: 500 });
  }
}