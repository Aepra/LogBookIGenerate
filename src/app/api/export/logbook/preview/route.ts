/**
 * Export Logbook Preview API
 * ============================
 * GET endpoint that generates a logbook as DOCX and converts to HTML preview.
 * Uses the same generation logic as download but returns HTML via mammoth.
 *
 * Query params:
 *   - logbook_id (required)
 */

import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserIdByEmail, getUserByEmail } from "@/lib/user";
import { getLogbookById } from "@/services/logbook.service";
import { getActivitiesByLogbookId } from "@/services/activity.service";
import { getPhotosByActivityIds } from "@/services/photo.service";
import { generateLogbookDocx } from "@/services/export-docx.service";
import type { PhotoRecord } from "@/services/photo.service";
import mammoth from "mammoth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const logbookId = searchParams.get("logbook_id");

  if (!logbookId) {
    return NextResponse.json({ error: "logbook_id is required" }, { status: 400 });
  }

  try {
    const userId = await getUserIdByEmail(session.user.email);
    const userProfile = await getUserByEmail(session.user.email);

    if (!userId || !userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch logbook
    const logbook = await getLogbookById(logbookId, userId);
    if (!logbook) {
      return NextResponse.json({ error: "Logbook not found" }, { status: 404 });
    }

    // Fetch activities
    const activities = await getActivitiesByLogbookId(logbookId);

    // Fetch photos for all activities
    const activityIds = activities.map((a) => a.id);
    const photoMap = await getPhotosByActivityIds(activityIds);

    // Attach photos to each activity
    const activitiesWithPhotos = activities.map((activity) => {
      const photos = photoMap.get(activity.id) || [];
      return {
        ...activity,
        photos: photos.map((p: PhotoRecord) => ({
          ...p,
          google_file_id: p.google_file_id,
          file_url: `/api/photos/proxy?fileId=${p.google_file_id}`,
          thumbnail_url: `/api/photos/proxy?fileId=${p.google_file_id}`,
        })),
      };
    });

    // Get access token for Drive photo fetching
    const accessToken = (session as unknown as { accessToken?: string }).accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Google Drive access token not available. Please re-login." },
        { status: 401 }
      );
    }

    // Generate DOCX buffer
    const fileBuffer = await generateLogbookDocx({
      logbook,
      activities: activitiesWithPhotos,
      user: userProfile,
      accessToken,
    });

    // Convert DOCX to HTML using mammoth
    const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength) as ArrayBuffer;
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap: [
          "p[style-name='center'] => p:fresh > center:fresh",
          "r[style-name='Strong'] => strong",
        ],
      }
    );

    const html = result.value;

    // Wrap HTML in a clean document with styling
    const styledHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview Logbook</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      padding: 40px 60px;
      max-width: 210mm;
      margin: 0 auto;
      background: #f5f5f5;
    }
    .preview-container {
      background: #fff;
      padding: 60px 80px;
      min-height: 297mm;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 12px 0;
    }
    table td, table th {
      border: 1px solid #000;
      padding: 6px 8px;
      vertical-align: top;
      font-size: 11pt;
    }
    table th {
      background: #f0f0f0;
      font-weight: bold;
      text-align: center;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    p {
      margin: 6px 0;
    }
    h1, h2, h3, h4 {
      margin: 12px 0 6px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .preview-container { box-shadow: none; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px;text-align:right;">
    <button onclick="window.print()" style="padding:8px 20px;background:#2563eb;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;">
      🖨️ Print / Save PDF
    </button>
  </div>
  <div class="preview-container">
    ${html}
  </div>
</body>
</html>`;

    return new NextResponse(styledHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[Preview API] Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses preview logbook. Silakan coba lagi." },
      { status: 500 }
    );
  }
}