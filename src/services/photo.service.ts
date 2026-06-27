/**
 * Photo Service — v2
 * ===================
 * Business logic for photo operations.
 * Coordinates between API route and google-drive.service.
 *
 * v2 changes:
 *   - logbookId as folder key (was logbookTitle) — matches Drive service v2
 *   - TraceContext logging (trace.log instead of console.log)
 *   - refreshToken callback passed through to Drive service
 *   - Structured errors via DriveError
 *   - Single path for activity → logbook query (removed redundant verifyActivityOwnership)
 */

import { supabaseAdmin } from "@/lib/supabase-server";
import type { TraceContext } from "@/types/drive"; // Can be renamed later, but keep for now
import { uploadToCloudinary } from "@/services/cloudinary.service";

export interface PhotoRecord {
  id: string;
  activity_id: string;
  google_file_id: string; // We'll store Cloudinary URL here for now to avoid DB migrations
  google_drive_url: string; // Keep for backwards compatibility
  created_at: string;
}

export interface PhotoUploadResult {
  success: boolean;
  photo?: PhotoRecord;
  error?: string;
  code?: string;
  step?: string;
  retryable?: boolean;
}

// ─────────────────────────────────────
//  INTERNAL HELPERS
// ─────────────────────────────────────

async function savePhotoMetadata(
  activityId: string,
  cloudinaryUrl: string
): Promise<PhotoRecord> {
  const { data, error } = await supabaseAdmin
    .from("photos")
    .insert({
      activity_id: activityId,
      google_file_id: cloudinaryUrl, // Store public URL directly
      google_drive_url: cloudinaryUrl, // Keep for backwards compatibility
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Gagal menyimpan metadata foto: ${error.message}`);
  }

  return data as PhotoRecord;
}

// ─────────────────────────────────────
//  EXPORTED: GETTERS
// ─────────────────────────────────────

export async function getPhotosByActivityId(
  activityId: string
): Promise<PhotoRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("photos")
    .select("*")
    .eq("activity_id", activityId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[Photo Service] Gagal mengambil foto:", error.message);
    return [];
  }

  return (data as PhotoRecord[]) || [];
}

export async function getPhotosByActivityIds(
  activityIds: string[]
): Promise<Map<string, PhotoRecord[]>> {
  if (activityIds.length === 0) return new Map();

  const grouped = new Map<string, PhotoRecord[]>();
  
  const chunkSize = 20;
  for (let i = 0; i < activityIds.length; i += chunkSize) {
    const chunk = activityIds.slice(i, i + chunkSize);
    
    const { data, error } = await supabaseAdmin
      .from("photos")
      .select("*")
      .in("activity_id", chunk)
      .order("created_at", { ascending: true });

    if (error || !data) {
      console.error("[Photo Service] Gagal mengambil batch foto (chunk):", error?.message);
      continue;
    }

    for (const photo of data as PhotoRecord[]) {
      const existing = grouped.get(photo.activity_id) || [];
      existing.push(photo);
      grouped.set(photo.activity_id, existing);
    }
  }

  return grouped;
}

// ─────────────────────────────────────
//  EXPORTED: UPLOAD (Cloudinary)
// ─────────────────────────────────────

export async function uploadActivityPhoto(
  trace: TraceContext,
  activityId: string,
  userId: string,
  fileName: string,
  mimeType: string,
  fileBuffer: ArrayBuffer
): Promise<PhotoUploadResult> {
  try {
    trace.log("UPLOAD", "Step 1: fetching activity from DB");
    const { data: activity, error: activityError } = await supabaseAdmin
      .from("activities")
      .select("logbook_id")
      .eq("id", activityId)
      .single();

    if (activityError || !activity) {
      trace.error("UPLOAD", "activity not found", { error: activityError?.message });
      return { success: false, error: "Activity tidak ditemukan.", code: "ACTIVITY_NOT_FOUND", step: "STEP1_ACTIVITY", retryable: false };
    }

    const logbookId = activity.logbook_id;

    trace.log("UPLOAD", "Step 2: fetching logbook", { logbookId });
    const { data: logbook, error: logbookError } = await supabaseAdmin
      .from("logbooks")
      .select("title, user_id")
      .eq("id", logbookId)
      .single();

    if (logbookError || !logbook) {
      trace.error("UPLOAD", "logbook not found", { error: logbookError?.message, code: logbookError?.code });
      return { success: false, error: "Logbook tidak ditemukan.", code: "LOGBOOK_NOT_FOUND", step: "STEP2_LOGBOOK", retryable: false };
    }

    if (logbook.user_id !== userId) {
      trace.error("UPLOAD", "ownership denied", { logbookUserId: logbook.user_id, userId });
      return { success: false, error: "Anda tidak memiliki akses ke activity ini.", code: "OWNERSHIP_DENIED", step: "STEP2_OWNERSHIP", retryable: false };
    }

    trace.log("UPLOAD", "Step 3: uploading to Cloudinary", { fileName, logbookId });
    
    const uploadResult = await uploadToCloudinary(trace, fileBuffer, logbookId, fileName);

    if (!uploadResult || !uploadResult.url) {
      trace.error("UPLOAD", "Cloudinary upload returned null");
      return {
        success: false,
        error: "Gagal mengupload file ke Cloudinary.",
        code: "CLOUDINARY_API_ERROR",
        step: "UPLOAD_TO_CLOUDINARY",
        retryable: true,
      };
    }

    trace.log("UPLOAD", "Step 4: saving to DB");
    try {
      const photo = await savePhotoMetadata(
        activityId,
        uploadResult.url
      );

      trace.log("UPLOAD", "Step 4a: photo saved", { photoId: photo.id });
      return { success: true, photo };
    } catch (dbError) {
      const dbMsg = dbError instanceof Error ? dbError.message : "Gagal menyimpan metadata foto.";
      trace.error("UPLOAD", `DB insert failed after Cloudinary upload`, { message: dbMsg });
      return {
        success: false,
        error: "Foto berhasil diupload tetapi gagal disimpan di database.",
        code: "DB_INSERT_FAILED",
        step: "SAVE_METADATA",
        retryable: true,
      };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan saat upload.";
    trace.error("UPLOAD", `unhandled error: ${message}`);
    return { success: false, error: message, code: "UNKNOWN", step: "UNKNOWN", retryable: false };
  }
}

// ─────────────────────────────────────
//  EXPORTED: DELETE
// ─────────────────────────────────────

/**
 * Deletes a photo (metadata only — Drive file deletion is optional).
 * Only the owner of the activity can delete photos.
 */
export async function deletePhoto(
  photoId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify photo exists and belongs to user's activity
    const { data: photo, error: photoError } = await supabaseAdmin
      .from("photos")
      .select("activity_id")
      .eq("id", photoId)
      .single();

    if (photoError || !photo) {
      return { success: false, error: "Foto tidak ditemukan." };
    }

    // Verify ownership via activity → logbook chain
    const { data: activity, error: actError } = await supabaseAdmin
      .from("activities")
      .select("logbook_id")
      .eq("id", photo.activity_id)
      .single();

    if (actError || !activity) {
      return { success: false, error: "Activity tidak ditemukan." };
    }

    const { data: logbook, error: logError } = await supabaseAdmin
      .from("logbooks")
      .select("id")
      .eq("id", activity.logbook_id)
      .eq("user_id", userId)
      .single();

    if (logError || !logbook) {
      return { success: false, error: "Anda tidak memiliki akses ke foto ini." };
    }

    // Delete metadata from Supabase
    const { error: deleteError } = await supabaseAdmin
      .from("photos")
      .delete()
      .eq("id", photoId);

    if (deleteError) {
      return {
        success: false,
        error: `Gagal menghapus foto: ${deleteError.message}`,
      };
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan.";
    return { success: false, error: message };
  }
}