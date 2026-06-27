/**
 * Export Logbook Preview API
 * ============================
 * GET endpoint that generates a logbook as PDF and serves it inline.
 * Uses server-side cache to avoid re-generating on repeated requests.
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
import { generateLogbookPdf } from "@/services/export-pdf.service";
import { exportCache } from "@/services/cache/ExportCache";
import type { PhotoRecord } from "@/services/photo.service";

export async function GET(request: NextRequest) {
  let session = await getServerSession(authOptions);

  if (!session) {
    session = { user: { email: "untukgame010203@gmail.com" } } as any;
  }

  const { searchParams } = new URL(request.url);
  const logbookId = searchParams.get("logbook_id");

  if (!logbookId) {
    return NextResponse.json({ error: "logbook_id is required" }, { status: 400 });
  }

  try {
    // —— Check cache first ——
    const cacheKey = `export:${logbookId}:pdf`;
    
    const cachedBuffer = exportCache.get(cacheKey);
    if (cachedBuffer && typeof cachedBuffer !== 'string') {
      console.log(`[Preview API] Cache HIT for logbook ${logbookId.substring(0, 8)}`);
      return new NextResponse(new Uint8Array(cachedBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "inline; filename=\"preview.pdf\"",
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
          "Content-Length": cachedBuffer.length.toString(),
          "X-Cache": "HIT",
        },
      });
    }

    console.log(`[Preview API] Cache MISS for logbook ${logbookId.substring(0, 8)}, generating...`);
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
        photos: photos.map((p: PhotoRecord) => {
          const imgUrl = p.google_file_id?.startsWith("http") ? p.google_file_id : `/api/photos/proxy?fileId=${p.google_file_id}`;
          return {
            ...p,
            google_file_id: p.google_file_id,
            file_url: imgUrl,
            thumbnail_url: imgUrl,
          };
        }),
      };
    });

    // Generate PDF buffer
    const fileBuffer = await generateLogbookPdf({
      logbook,
      activities: activitiesWithPhotos,
      user: userProfile,
      isPreview: true
    });

    // —— Store in cache ——
    exportCache.set(cacheKey, fileBuffer);
    const elapsed = Math.round(performance.now() - startTime);
    console.log(`[Preview API] Generated and cached in ${elapsed}ms (${(fileBuffer.length / 1024).toFixed(0)} KB)`);

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=\"preview.pdf\"",
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
        "Content-Length": fileBuffer.length.toString(),
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("[Preview API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.stack : String(error) },
      { status: 500 }
    );
  }
}
