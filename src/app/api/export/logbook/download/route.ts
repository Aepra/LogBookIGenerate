/**
 * Export Logbook Download API
 * ============================
 * GET endpoint that downloads a logbook as DOCX or PDF file.
 * Uses server-side cache — if user previewed first, PDF download is instant.
 *
 * Query params:
 *   - logbook_id (required)
 *   - format (required): "docx" | "pdf"
 */

import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserIdByEmail, getUserByEmail } from "@/lib/user";
import { getLogbookById } from "@/services/logbook.service";
import { getActivitiesByLogbookId } from "@/services/activity.service";
import { getPhotosByActivityIds } from "@/services/photo.service";
import { generateLogbookDocx } from "@/services/export-docx.service";
import { generateLogbookPdf } from "@/services/export-pdf.service";
import { exportCache } from "@/services/cache/ExportCache";
import type { PhotoRecord } from "@/services/photo.service";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const logbookId = searchParams.get("logbook_id");
  const format = searchParams.get("format") || "docx";

  if (!logbookId) {
    return NextResponse.json({ error: "logbook_id is required" }, { status: 400 });
  }

  if (format !== "docx" && format !== "pdf") {
    return NextResponse.json({ error: "format must be 'docx' or 'pdf'" }, { status: 400 });
  }

  try {
    // ── Check cache first ──
    const cacheKey = `export:${logbookId}:${format}`;
    const cachedBuffer = exportCache.get(cacheKey);

    if (cachedBuffer) {
      console.log(`[Download API] Cache HIT for logbook ${logbookId.substring(0, 8)} (${format})`);
      const mimeType = format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const fileName = `LogBook_${logbookId.substring(0, 8)}.${format}`;

      return new NextResponse(new Uint8Array(cachedBuffer), {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": cachedBuffer.length.toString(),
          "X-Cache": "HIT",
        },
      });
    }

    console.log(`[Download API] Cache MISS for logbook ${logbookId.substring(0, 8)} (${format}), generating...`);
    const startTime = performance.now();

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
    const refreshToken = (session as unknown as { refreshToken?: string }).refreshToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Google Drive access token not available. Please re-login." },
        { status: 401 }
      );
    }

    let fileBuffer: Buffer;
    let mimeType: string;
    let fileName: string;

    if (format === "pdf") {
      fileBuffer = await generateLogbookPdf({
        logbook,
        activities: activitiesWithPhotos,
        user: userProfile,
        accessToken,
        refreshToken,
      });
      mimeType = "application/pdf";
      fileName = `LogBook_${logbook.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    } else {
      fileBuffer = await generateLogbookDocx({
        logbook,
        activities: activitiesWithPhotos,
        user: userProfile,
        accessToken,
        refreshToken,
      });
      mimeType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      fileName = `LogBook_${logbook.title.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;
    }

    // ── Store in cache ──
    exportCache.set(cacheKey, fileBuffer);
    const elapsed = Math.round(performance.now() - startTime);
    console.log(`[Download API] Generated and cached in ${elapsed}ms (${(fileBuffer.length / 1024).toFixed(0)} KB)`);

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": fileBuffer.length.toString(),
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("[Export Download] Error:", error);
    return NextResponse.json(
      { error: "Gagal mengexport logbook. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
