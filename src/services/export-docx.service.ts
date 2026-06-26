/**
 * Ekspor DOCX Service
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
import { refreshAccessToken } from "@/lib/token-refresh";
import sharp from "sharp";

// Monkey patch docxtemplater ScopeManager prototype to fix docxtemplater-image-module compatibility.
// This is necessary because ScopeManager in newer versions of docxtemplater expects context (meta)
// on getValue() which docxtemplater-image-module does not supply, causing TypeError.
try {
  const scopeManagerFactory = require("docxtemplater/js/scope-manager");
  const dummy = scopeManagerFactory({ tags: {} });
  const ScopeManagerProto = Object.getPrototypeOf(dummy);
  const originalGetValue = ScopeManagerProto.getValue;
  ScopeManagerProto.getValue = function(tag: string, meta: any) {
    if (!meta) {
      meta = { part: { type: "placeholder", value: tag } };
    }
    return originalGetValue.call(this, tag, meta);
  };
} catch (e) {
  console.error("[Export Service] Failed to monkey patch ScopeManager:", e);
}

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

/**
 * Fetch multiple Drive images in batched parallel.
 * Returns a Map<activityId, Buffer | null>
 *
 * Optimization notes:
 *   - Images resized to 500px (was 800px) — template only shows ~85px
 *   - JPEG quality 60 (was 80) — sufficient for small template images
 *   - Batched in groups of 5 to avoid Google Drive rate-limits
 */
const IMAGE_BATCH_SIZE = 5;
const IMAGE_RESIZE_WIDTH = 500;
const IMAGE_JPEG_QUALITY = 60;

async function fetchDriveImagesParallel(
  grouped: { activityId: string; fileId: string }[],
  accessToken: string,
  refreshToken?: string,
  imageDimensions?: Map<Buffer, [number, number]>
): Promise<Map<string, Buffer | null>> {
  const results = new Map<string, Buffer | null>();
  if (grouped.length === 0) return results;

  let currentToken = accessToken;

  const fetchSingleImage = async (fileId: string, token: string): Promise<Buffer | null> => {
    try {
      let arrayBuffer: ArrayBuffer | null = null;
      const res = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401 && refreshToken) {
          const refreshed = await refreshAccessToken({ refreshToken });
          if (refreshed.accessToken) {
            currentToken = refreshed.accessToken;
            const retryRes = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
              headers: { Authorization: `Bearer ${currentToken}` },
            });
            if (retryRes.ok) {
              arrayBuffer = await retryRes.arrayBuffer();
            }
          }
        }
      } else {
        arrayBuffer = await res.arrayBuffer();
      }

      if (!arrayBuffer) return null;

      const buffer = Buffer.from(arrayBuffer);
      // Compress the image using sharp — optimized for small template cells
      const { data, info } = await sharp(buffer)
        .resize({ width: IMAGE_RESIZE_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: IMAGE_JPEG_QUALITY })
        .toBuffer({ resolveWithObject: true });
        
      if (imageDimensions) {
        imageDimensions.set(data, [info.width, info.height]);
      }
      return data;
    } catch (e) {
      console.error(`[Export Service] Error fetching/compressing image ${fileId}:`, e);
      return null;
    }
  };

  // Process in batches to avoid rate-limiting and memory spikes
  for (let i = 0; i < grouped.length; i += IMAGE_BATCH_SIZE) {
    const batch = grouped.slice(i, i + IMAGE_BATCH_SIZE);
    const fetches = batch.map(async ({ activityId, fileId }) => {
      const buffer = await fetchSingleImage(fileId, currentToken);
      results.set(activityId, buffer);
    });
    await Promise.all(fetches);
  }

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
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
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
  refreshToken?: string;
}): Promise<Buffer> {
  const { logbook, activities, user, accessToken, refreshToken } = params;

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

  const imageDimensions = new Map<Buffer, [number, number]>();
  const photoBuffers = await fetchDriveImagesParallel(photoFetchList, accessToken, refreshToken, imageDimensions);

  // ─────────────────────────────────────
  //  BUILD ACTIVITIES DATA FOR TEMPLATE (PER WEEK)
  // ─────────────────────────────────────
  
  function getMonday(d: Date) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  function getYYYYMMDD(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  let startMonday: Date | null = null;
  let maxDate: Date | null = null;
  
  if (sortedDates.length > 0) {
    startMonday = getMonday(new Date(sortedDates[0]));
    startMonday.setHours(0, 0, 0, 0);
    maxDate = new Date(sortedDates[sortedDates.length - 1]);
    maxDate.setHours(0, 0, 0, 0);
  }

  const weeksMap = new Map<number, { week_number: number, total_duration_minutes: number, activities: any[] }>();

  if (startMonday && maxDate) {
    const totalWeeks = Math.floor((maxDate.getTime() - startMonday.getTime()) / (1000 * 60 * 60 * 24) / 7) + 1;
    let no = 1;

    for (let w = 1; w <= totalWeeks; w++) {
      const weekActivities: any[] = [];
      let weekDuration = 0;
      const weekMonday = new Date(startMonday.getTime() + (w - 1) * 7 * 24 * 60 * 60 * 1000);

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDate = new Date(weekMonday.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const dateStr = getYYYYMMDD(currentDate);
        const dayActivities = byDate[dateStr];

        if (dayActivities && dayActivities.length > 0) {
          const currentNo = `${no}.`;
          for (let i = 0; i < dayActivities.length; i++) {
            const act = dayActivities[i];
            const timeStr = act.start_time && act.end_time ? `${formatTime(act.start_time)} - ${formatTime(act.end_time)}` : "—";
            
            let noStr = currentNo;
            let hari = getDayName(dateStr) + ",";
            let tanggal = formatDateShort(dateStr);

            if (dayActivities.length > 1) {
              if (i === 0) {
                noStr = "@@VMERGE_RESTART@@" + noStr;
                hari = "@@VMERGE_RESTART@@" + hari;
              } else {
                noStr = "@@VMERGE_CONTINUE@@";
                hari = "@@VMERGE_CONTINUE@@";
                tanggal = "";
              }
            }

            let durasi = "—";
            if (act.start_time && act.end_time) {
              const [sh, sm] = act.start_time.split(":").map(Number);
              const [eh, em] = act.end_time.split(":").map(Number);
              const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
              if (diffMinutes > 0) {
                durasi = `${diffMinutes} menit`;
                weekDuration += diffMinutes;
              }
            }
            
            const FALLBACK_1x1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", "base64");
            const fotoValue = photoBuffers.get(act.id);
            const fotoBuffer = fotoValue && Buffer.isBuffer(fotoValue) && fotoValue.length > 0 ? fotoValue : FALLBACK_1x1;

            weekActivities.push({ no: noStr, hari, tanggal, durasi, waktu: timeStr, kegiatan: act.title || "—", kendala: act.obstacle || "—", foto: fotoBuffer });
          }
          no++;
        } else {
            // EMPTY ROW
            const FALLBACK_1x1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", "base64");
            weekActivities.push({
              no: "@@RED_BG@@—",
              hari: "@@RED_BG@@" + getDayName(dateStr) + ",",
              tanggal: formatDateShort(dateStr),
              durasi: "—",
              waktu: "—",
              kegiatan: "TIDAK ADA KEGIATAN",
              kendala: "—",
              foto: FALLBACK_1x1
            });
        }
      }

      weeksMap.set(w, { week_number: w, total_duration_minutes: weekDuration, activities: weekActivities });
    }
  }

  // Convert map to sorted array and format total duration
  const weeks = Array.from(weeksMap.values())
    .sort((a, b) => a.week_number - b.week_number)
    .map(w => {
      let total_duration = "—";
      if (w.total_duration_minutes > 0) {
        const hours = Math.floor(w.total_duration_minutes / 60);
        const minutes = w.total_duration_minutes % 60;
        total_duration = hours > 0 
            ? (minutes > 0 ? `${hours} jam ${minutes} menit` : `${hours} jam`)
            : `${minutes} menit`;
      }
      return {
        week_number: w.week_number,
        total_duration: total_duration,
        activities: w.activities
      };
    });

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
      const MAX_WIDTH = 85; // Max width to fit within typical docx column
      const dims = imageDimensions.get(_buffer);
      if (dims) {
        const [w, h] = dims;
        if (w > MAX_WIDTH) {
          const ratio = MAX_WIDTH / w;
          return [MAX_WIDTH, Math.round(h * ratio)];
        }
        return [w, h];
      }
      return [85, 65]; // fallback
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
    weeks: weeks,
  };

  // ─────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────
  try {
    console.log("=== WEEKS DATA ===", JSON.stringify(weeks, null, 2));
    doc.render(data);
  } catch (renderError: any) {
    console.error("[DOCX Generation] Render error:", renderError?.message || renderError);
    console.error("[DOCX Generation] Data keys:", Object.keys(data));
    console.error("[DOCX Generation] user keys:", Object.keys(user));
    console.error("[DOCX Generation] logbook keys:", Object.keys(logbookAny));
    throw renderError;
  }

  // ─────────────────────────────────────
  //  APPLY XML MANIPULATION (MERGE & ALIGN)
  // ─────────────────────────────────────
  const documentXmlFile = doc.getZip().file("word/document.xml");
  if (!documentXmlFile) {
    throw new Error("Could not find word/document.xml in generated docx");
  }
  let xml = documentXmlFile.asText();

  function injectIntoTcPr(tcPrInner: string, tagToInject: string, isVMerge: boolean) {
    let result = tcPrInner;
    if (isVMerge) {
      result = result.replace(/<w:vMerge\b[^>]*\/>/g, "");
      const match = result.match(/<(w:tcBorders|w:shd|w:vAlign|w:hideMark|w:headers)/);
      if (match) {
        result = result.replace(match[0], tagToInject + match[0]);
      } else {
        result = result + tagToInject;
      }
    } else {
      result = result.replace(/<w:vAlign\b[^>]*\/>/g, "");
      const match = result.match(/<(w:hideMark|w:headers)/);
      if (match) {
        result = result.replace(match[0], tagToInject + match[0]);
      } else {
        result = result + tagToInject;
      }
    }
    return result;
  }

  function injectIntoPPr(pPrInner: string, tagToInject: string) {
    let result = pPrInner.replace(/<w:jc\b[^>]*\/>/g, "");
    const match = result.match(/<(w:rPr|w:sectPr|w:pPrChange)/);
    if (match) {
      result = result.replace(match[0], tagToInject + match[0]);
    } else {
      result = result + tagToInject;
    }
    return result;
  }

  // 1. Process VMERGE_RESTART
  xml = xml.replace(/<w:tc>(?:(?!<w:tc>).)*?@@VMERGE_RESTART@@/gs, function(match) {
    let replaced = match;
    const tcPrMatch = replaced.match(/<w:tcPr\b[^>]*>(?<!\/>)(.*?)<\/w:tcPr>/s) || replaced.match(/<w:tcPr\/>/);
    if (tcPrMatch) {
      let inner = tcPrMatch[0] === "<w:tcPr/>" ? "" : tcPrMatch[1];
      inner = injectIntoTcPr(inner, '<w:vMerge w:val="restart"/>', true);
      replaced = replaced.replace(tcPrMatch[0], `<w:tcPr>${inner}</w:tcPr>`);
    } else {
      replaced = replaced.replace("<w:tc>", `<w:tc><w:tcPr><w:vMerge w:val="restart"/></w:tcPr>`);
    }
    return replaced.replace("@@VMERGE_RESTART@@", "");
  });

  // 2. Process VMERGE_CONTINUE
  xml = xml.replace(/<w:tc>(?:(?!<w:tc>).)*?@@VMERGE_CONTINUE@@(?:(?!<\/w:tc>).)*?<\/w:tc>/gs, function(match) {
    const tcPrMatch = match.match(/<w:tcPr\b[^>]*>(?<!\/>)(.*?)<\/w:tcPr>/s) || match.match(/<w:tcPr\/>/);
    let newTcPr = '<w:tcPr><w:vMerge w:val="continue"/></w:tcPr>';
    if (tcPrMatch) {
      let inner = tcPrMatch[0] === "<w:tcPr/>" ? "" : tcPrMatch[1];
      inner = injectIntoTcPr(inner, '<w:vMerge w:val="continue"/>', true);
      newTcPr = `<w:tcPr>${inner}</w:tcPr>`;
    }
    return `<w:tc>${newTcPr}<w:p/></w:tc>`;
  });

  // 3. Process VERTICAL ALIGN CENTER for all cells
  xml = xml.replace(/<w:tcPr\b[^>]*>(?<!\/>)(.*?)<\/w:tcPr>/gs, function(match, inner) {
    return `<w:tcPr>${injectIntoTcPr(inner, '<w:vAlign w:val="center"/>', false)}</w:tcPr>`;
  });
  xml = xml.replace(/<w:tcPr\/>/g, '<w:tcPr><w:vAlign w:val="center"/></w:tcPr>');

  // 4. Process HORIZONTAL ALIGN CENTER for image paragraphs
  xml = xml.replace(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g, function(match, inner) {
    if (inner.includes("<w:drawing>") || inner.includes("<v:imagedata")) {
      const pPrMatch = match.match(/<w:pPr\b[^>]*>(?<!\/>)(.*?)<\/w:pPr>/s) || match.match(/<w:pPr\/>/);
      let newPPr = '<w:pPr><w:jc w:val="center"/></w:pPr>';
      if (pPrMatch) {
        let innerPPr = pPrMatch[0] === "<w:pPr/>" ? "" : pPrMatch[1];
        innerPPr = injectIntoPPr(innerPPr, '<w:jc w:val="center"/>');
        newPPr = `<w:pPr>${innerPPr}</w:pPr>`;
        return match.replace(pPrMatch[0], newPPr);
      } else {
        return match.replace(/(<w:p\b[^>]*>)/, `$1${newPPr}`);
      }
    }
    return match;
  });

  // 5. Process RED BACKGROUND for empty rows
  xml = xml.replace(/<w:tr[\s\S]*?<\/w:tr>/g, function(trMatch) {
    if (trMatch.includes("@@RED_BG@@")) {
      // Remove the markers from the visible text
      let newTr = trMatch.replace(/@@RED_BG@@/g, "");
      // Inject red background into all cell properties in this row
      newTr = newTr.replace(/<w:tcPr\b[^>]*>(?<!\/>)(.*?)<\/w:tcPr>/gs, function(tcPrMatch, inner) {
        let innerClean = inner.replace(/<w:shd\b[^>]*\/>/g, "");
        const match = innerClean.match(/<(w:vAlign|w:hideMark|w:headers)/);
        if (match) {
          innerClean = innerClean.replace(match[0], '<w:shd w:fill="FFCCCC" w:val="clear"/>' + match[0]);
        } else {
          innerClean = innerClean + '<w:shd w:fill="FFCCCC" w:val="clear"/>';
        }
        return `<w:tcPr>${innerClean}</w:tcPr>`;
      });
      newTr = newTr.replace(/<w:tcPr\/>/g, '<w:tcPr><w:shd w:fill="FFCCCC" w:val="clear"/></w:tcPr>');
      return newTr;
    }
    return trMatch;
  });


  doc.getZip().file("word/document.xml", xml);

  // ─────────────────────────────────────
  //  GENERATE BUFFER
  // ─────────────────────────────────────
  return doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}
