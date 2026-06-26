/**
 * Export DOCX Service
 * ====================
 * Generates a .docx file from logbook data using the template template_logbook.docx.
 * Uses docxtemplater + pizzip to parse the template and inject data.
 * Uses docxtemplater-image-module for photo placeholders.
 */

import * as fs from "fs";
import * as path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

/**
 * Fetch multiple Drive images in parallel.
 * Returns a Map<activityId, Buffer | null>
 */
async function fetchDriveImagesParallel(
  grouped: { activityId: string; fileId: string }[],
  accessToken: string
): Promise<Map<string, Buffer | null>> {
  const results = new Map<string, Buffer | null>();
  if (grouped.length === 0) return results;

  const fetches = grouped.map(async ({ activityId, fileId }) => {
    try {
      const res = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        results.set(activityId, null);
        return;
      }
      const arrayBuffer = await res.arrayBuffer();
      results.set(activityId, Buffer.from(arrayBuffer));
    } catch {
      results.set(activityId, null);
    }
  });

  await Promise.all(fetches);
  return results;
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${days[d.getUTCDay()]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatTime(time: string | null): string {
  if (!time) return "—";
  return time.substring(0, 5);
}

/**
 * Simple day-of-week name in Indonesian.
 */
function getDayName(dateStr: string): string {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const d = new Date(dateStr + "T00:00:00Z");
  return days[d.getUTCDay()];
}

// ─────────────────────────────────────
//  MAIN EXPORT FUNCTION
// ─────────────────────────────────────
export async function generateLogbookDocx(params: {
  logbook: any;
  activities: any[];
  user: any;
  accessToken: string;
}): Promise<Buffer> {
  const { logbook, activities, user, accessToken } = params;

  // Group activities by date (ascending — oldest first, as in a real logbook)
  const byDate: Record<string, any[]> = {};
  for (const act of activities) {
    const key = act.activity_date;
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(act);
  }

  const sortedDates = Object.keys(byDate).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // ─────────────────────────────────────
  //  BATCH FETCH PHOTOS (parallel)
  // ─────────────────────────────────────
  // Collect all (activityId, fileId) pairs first
  const photoFetchList: { activityId: string; fileId: string }[] = [];
  for (const act of activities) {
    if (act.photos?.length && act.photos[0]?.google_file_id) {
      photoFetchList.push({
        activityId: act.id,
        fileId: act.photos[0].google_file_id,
      });
    }
  }

  const photoBuffers = await fetchDriveImagesParallel(photoFetchList, accessToken);

  // ─────────────────────────────────────
  //  BUILD ACTIVITIES DATA FOR TEMPLATE
  // ─────────────────────────────────────
  const activitiesData: any[] = [];
  let no = 1;
  for (const date of sortedDates) {
    const dayActivities = byDate[date];
    for (const act of dayActivities) {
      const timeStr =
        act.start_time && act.end_time
          ? `${formatTime(act.start_time)} – ${formatTime(act.end_time)}`
          : "—";

      const hari = getDayName(date);
      const tanggal = formatDateShort(date);

      // Calculate duration (in minutes) if start/end time available
      let durasi = "—";
      if (act.start_time && act.end_time) {
        const [sh, sm] = act.start_time.split(":").map(Number);
        const [eh, em] = act.end_time.split(":").map(Number);
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        durasi = diff > 0 ? `${diff} menit` : "—";
      }

      // Get photo buffer from pre-fetched map.
      // IMPORTANT: Must never be null — docxtemplater's image module will crash on null.
      // Use a 1×1 transparent pixel as fallback when no photo is available.
      const FALLBACK_1x1 = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "base64"
      );
      const fotoValue = photoBuffers.get(act.id);
      const fotoBuffer = fotoValue && Buffer.isBuffer(fotoValue) && fotoValue.length > 0
        ? fotoValue
        : FALLBACK_1x1;

      activitiesData.push({
        no: no++,
        hari,
        tanggal,
        durasi,
        waktu: timeStr,
        kegiatan: act.title || "—",
        kendala: act.obstacle || "—",
        foto: fotoBuffer,
      });
    }
  }

  // ─────────────────────────────────────
  //  READ TEMPLATE
  // ─────────────────────────────────────
  const templatePath = path.resolve(process.cwd(), "template", "template_logbook.docx");
  const templateContent = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(templateContent);

  // ─────────────────────────────────────
  //  CONFIGURE IMAGE MODULE
  // ─────────────────────────────────────
  const imageModule = new ImageModule({
    getImage: (tagValue: string | Buffer, _tagName: string) => {
      if (Buffer.isBuffer(tagValue) && tagValue.length > 0) {
        return tagValue;
      }
      if (typeof tagValue === "string") {
        try {
          return fs.readFileSync(tagValue);
        } catch {
          // fall through to fallback
        }
      }
      // 1×1 transparent pixel fallback
      return Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "base64"
      );
    },
    getSize: (_buffer: Buffer, _tagName: string): [number, number] => {
      return [150, 110]; // width, height in pixels
    },
  });

  // ─────────────────────────────────────
  //  INIT DOCXTEMPLATER
  // ─────────────────────────────────────
  const doc = new Docxtemplater(zip, {
    modules: [imageModule],
    paragraphLoop: true,
    linebreaks: true,
  });

  // ─────────────────────────────────────
  //  PREPARE DATA
  // ─────────────────────────────────────
  // NOTE: The Logbook type from logbook.service doesn't include location/mentor etc.
  // but the actual DB row has these fields (added later via migrations).
  // We access them via the `any` type on the logbook parameter.
  const logbookAny = logbook as Record<string, any>;

  const data: Record<string, any> = {
    name: user.name || "—",
    nim: user.nim || "—",
    location: logbookAny.location || logbookAny.institution_name || "—",
    mentor: logbookAny.mentor_name || "—",
    supervisor_name: logbookAny.supervisor_name || "—",
    study_program: (user.study_program || "").toUpperCase() || "—",
    faculty: (user.faculty || "").toUpperCase() || "—",
    univercity: (user.university || "").toUpperCase() || "—",
    tahun: user.batch_year || `${new Date().getFullYear()}`,
    activities: activitiesData,
  };

  // ─────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────
  try {
    doc.render(data);
  } catch (renderError: any) {
    console.error("[DOCX Generation] Render error:", renderError?.message || renderError);
    console.error("[DOCX Generation] Data keys:", Object.keys(data));
    console.error("[DOCX Generation] activities length:", data.activities?.length);
    console.error("[DOCX Generation] user keys:", Object.keys(user));
    console.error("[DOCX Generation] logbook keys:", Object.keys(logbookAny));
    // Log first activity data shape for debugging
    if (data.activities?.length > 0) {
      console.error("[DOCX Generation] First activity keys:", Object.keys(data.activities[0]));
    }
    throw renderError;
  }

  // ─────────────────────────────────────
  //  GENERATE BUFFER
  // ─────────────────────────────────────
  const buffer = doc.getZip().generate({
    type: "nodebuffer",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  return buffer as Buffer;
}
