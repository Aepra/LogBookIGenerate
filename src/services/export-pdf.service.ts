/**
 * Export PDF Service
 * ==================
 * Generates a PDF of the logbook entirely locally using pdfmake.
 * Emulates the template_logbook.docx layout EXACTLY.
 */

import pdfMake from "pdfmake";
import path from "path";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const fontsDir = path.join(process.cwd(), "node_modules", "pdfmake", "fonts", "Roboto");

pdfMake.fonts = {
  Roboto: {
    normal: path.join(fontsDir, "Roboto-Regular.ttf"),
    bold: path.join(fontsDir, "Roboto-Medium.ttf"),
    italics: path.join(fontsDir, "Roboto-Italic.ttf"),
    bolditalics: path.join(fontsDir, "Roboto-MediumItalic.ttf")
  }
};

export async function generateLogbookPdf(params: {
  logbook: any;
  activities: any[];
  user: any;
  isPreview?: boolean;
}): Promise<Buffer> {
  const { logbook, activities, user, isPreview } = params;

  // 1. Group Activities by Date (Ascending)
  const byDate: Record<string, any[]> = {};
  for (const act of activities) {
    const key = act.activity_date;
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(act);
  }

  const sortedDates = Object.keys(byDate).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // 2. Fetch all photos into base64 data URIs
  const imageMap = new Map<string, string>(); // activityId -> data URI
  const fetchPromises = activities.map(async (act) => {
    if (act.photos && act.photos.length > 0 && act.photos[0].file_url) {
      const url = act.photos[0].file_url;
      let optimizedUrl = url;
      if (optimizedUrl.includes("res.cloudinary.com") && optimizedUrl.includes("/upload/")) {
        optimizedUrl = optimizedUrl.replace("/upload/", "/upload/c_limit,w_400,q_70,f_jpg/");
      }

      try {
        const res = await fetch(optimizedUrl);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const header = buffer.toString('hex', 0, 4).toLowerCase();
          if (header.startsWith('ffd8') || header === '89504e47') {
            const base64 = buffer.toString("base64");
            const mimeType = header.startsWith('ffd8') ? 'image/jpeg' : 'image/png';
            imageMap.set(act.id, `data:${mimeType};base64,${base64}`);
          }
        }
      } catch (err) {
        console.error(`Gagal fetch foto untuk activity ${act.id}`, err);
      }
    }
  });

  await Promise.all(fetchPromises);

  // 3. Prepare Weeks Logic
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
    maxDate.setHours(23, 59, 59, 999);
  }

  const logbookAny = logbook as Record<string, any>;
  const prog = (user.study_program || "").toUpperCase() || "—";
  const fac = (user.faculty || "").toUpperCase() || "—";
  const univ = (user.university || "").toUpperCase() || "—";
  const yr = user.batch_year || `${new Date().getFullYear()}`;

  // ——————————————————————————————————————————————————————
  // PDF CONTENT DEFINITION
  // ——————————————————————————————————————————————————————
  
  const contentBlocks: any[] = [];

  // ==========================================
  // PAGE 1: COVER PAGE (Centered)
  // ==========================================
  contentBlocks.push({
    text: "LAPORAN LOGBOOK KEGIATAN",
    style: "coverTitle",
    alignment: "center",
    margin: [0, 80, 0, 60]
  });

  // Basic Info Block (Centered)
  contentBlocks.push({
    text: [
      { text: "Nama : ", bold: true }, `${user.name || "—"}\n\n`,
      { text: "NIM : ", bold: true }, `${user.nim || "—"}\n\n`,
      { text: "Lokasi PKL : ", bold: true }, `${logbookAny.location || logbookAny.institution_name || "—"}\n\n`,
      { text: "Pembimbing : ", bold: true }, `${logbookAny.mentor_name || "—"}\n\n`,
      { text: "Supervisor : ", bold: true }, `${logbookAny.supervisor_name || "—"}\n\n`
    ],
    alignment: "center",
    fontSize: 12,
    margin: [0, 0, 0, 60],
    lineHeight: 1.5
  });

  // University Info Block (Centered)
  contentBlocks.push({
    text: [
      { text: `PROGRAM STUDI ${prog} FAKULTAS ${fac}\n`, bold: true },
      { text: `UNIVERSITAS ${univ}\n`, bold: true },
      { text: `${yr}`, bold: true }
    ],
    alignment: "center",
    fontSize: 14,
    lineHeight: 1.5,
    pageBreak: 'after' // Page break!
  });

  // ==========================================
  // PAGE 2: KATA PENGANTAR
  // ==========================================
  contentBlocks.push({
    text: "Kata Pengantar",
    style: "heading1",
    alignment: "center",
    margin: [0, 40, 0, 40]
  });
  contentBlocks.push({
    text: "Puji syukur ke hadirat Tuhan Yang Maha Esa atas segala rahmat dan karunia-Nya sehingga laporan logbook kegiatan ini dapat diselesaikan dengan baik.\n\nLaporan ini disusun sebagai bentuk pertanggungjawaban atas kegiatan yang telah dilaksanakan. Semoga laporan ini dapat memberikan gambaran yang jelas mengenai seluruh rangkaian kegiatan.\n\nTerima kasih kepada semua pihak yang telah membantu pelaksanaan kegiatan ini.",
    alignment: "justify",
    fontSize: 12,
    lineHeight: 1.5,
    pageBreak: 'after' // Page break!
  });

  // ==========================================
  // PAGE 3: DAFTAR ISI
  // ==========================================
  contentBlocks.push({
    text: "Daftar Isi",
    style: "heading1",
    alignment: "center",
    margin: [0, 40, 0, 40]
  });
  contentBlocks.push({
    text: "1. Kata Pengantar ........................................................................................................ i\n2. Daftar Isi ................................................................................................................. ii\n3. Rekap Kegiatan ........................................................................................................ 1",
    fontSize: 12,
    lineHeight: 2,
    pageBreak: 'after' // Page break!
  });

  // ==========================================
  // PAGE 4: REKAP KEGIATAN (WEEKS)
  // ==========================================
  contentBlocks.push({
    text: "Rekap Kegiatan",
    style: "heading1",
    alignment: "center",
    margin: [0, 20, 0, 30]
  });

  if (startMonday && maxDate) {
    const totalWeeks = Math.floor((maxDate.getTime() - startMonday.getTime()) / (1000 * 60 * 60 * 24) / 7) + 1;
    let no = 1;

    for (let w = 1; w <= totalWeeks; w++) {
      let weekDuration = 0;
      const weekMonday = new Date(startMonday.getTime() + (w - 1) * 7 * 24 * 60 * 60 * 1000);

      const tableBody: any[][] = [];
      tableBody.push([
        { text: "No.", style: "tableHeader", alignment: "center" },
        { text: "Hari/Tanggal", style: "tableHeader", alignment: "center" },
        { text: "Durasi (menit)", style: "tableHeader", alignment: "center" },
        { text: "Waktu", style: "tableHeader", alignment: "center" },
        { text: "Kegiatan", style: "tableHeader", alignment: "center" },
        { text: "Kendala", style: "tableHeader", alignment: "center" },
        { text: "Dokumentasi", style: "tableHeader", alignment: "center" }
      ]);

      let hasActivities = false;

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDate = new Date(weekMonday.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const dateStr = getYYYYMMDD(currentDate);
        const dayActivities = byDate[dateStr];

        if (dayActivities && dayActivities.length > 0) {
          hasActivities = true;
          const currentNo = `${no}.`;
          
          for (let i = 0; i < dayActivities.length; i++) {
            const act = dayActivities[i];
            
            let waktu = "—";
            let durasiMin = 0;
            if (act.start_time && act.end_time) {
              waktu = `${act.start_time.substring(0, 5)} - ${act.end_time.substring(0, 5)}`;
              const [sh, sm] = act.start_time.split(":").map(Number);
              const [eh, em] = act.end_time.split(":").map(Number);
              durasiMin = (eh * 60 + em) - (sh * 60 + sm);
              if (durasiMin > 0) {
                weekDuration += durasiMin;
              }
            }

            const kegiatan = act.title || "—";
            const kendala = act.obstacle || "—";
            const imgDataUri = imageMap.get(act.id);
            
            const fotoCell = imgDataUri 
              ? { image: imgDataUri, width: 60, alignment: "center" } 
              : { text: "—", alignment: "center", margin: [0, 20, 0, 0] };

            let noCell: any = {};
            let hariCell: any = {};
            const hariStr = format(new Date(dateStr), "EEEE", { locale: id });
            const tangalStr = format(new Date(dateStr), "dd-MM-yyyy");

            if (i === 0) {
              noCell = { text: currentNo, alignment: "center", rowSpan: dayActivities.length };
              hariCell = { text: `${hariStr},\n${tangalStr}`, alignment: "center", rowSpan: dayActivities.length };
              no++;
            } else {
              noCell = "";
              hariCell = "";
            }

            tableBody.push([
              noCell,
              hariCell,
              { text: durasiMin > 0 ? durasiMin.toString() : "—", alignment: "center" },
              { text: waktu, alignment: "center" },
              kegiatan,
              kendala,
              fotoCell
            ]);
          }
        }
      }

      if (!hasActivities) {
         tableBody.push([
          { text: "-", alignment: "center", colSpan: 7 },
          {}, {}, {}, {}, {}, {}
         ]);
      }

      // Add footer for the week
      let total_duration_str = "—";
      if (weekDuration > 0) {
        const hours = Math.floor(weekDuration / 60);
        const minutes = weekDuration % 60;
        total_duration_str = hours > 0 
            ? (minutes > 0 ? `${hours} jam ${minutes} menit` : `${hours} jam`)
            : `${minutes} menit`;
      }
      
      tableBody.push([
        { text: "Total Durasi Pekan Ini:", style: "tableHeader", colSpan: 5, alignment: "left" },
        {}, {}, {}, {},
        { text: total_duration_str, style: "tableHeader", colSpan: 2, alignment: "center" },
        {}
      ]);

      // Push the week block
      contentBlocks.push({
        text: `Pekan ${w}`,
        style: "weekTitle",
        margin: [0, 10, 0, 5]
      });

      contentBlocks.push({
        table: {
          headerRows: 1,
          widths: ["auto", "auto", "auto", "auto", "*", "auto", 70],
          body: tableBody
        },
        layout: {
          fillColor: function (rowIndex: number, node: any, columnIndex: number) {
            return (rowIndex === 0 || rowIndex === node.table.body.length - 1) ? "#e5e7eb" : null;
          }
        },
        margin: [0, 0, 0, 30]
      });
    }
  } else {
     contentBlocks.push({
       text: "Belum ada kegiatan yang dicatat.",
       italics: true,
       alignment: "center",
       margin: [0, 20, 0, 0]
     });
  }

  // 4. Build Document Definition
  const docDefinition: any = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [40, 60, 40, 60],
    watermark: isPreview ? { text: "PREVIEW", color: "red", opacity: 0.1, bold: true, italics: false } : undefined,
    content: contentBlocks,
    styles: {
      coverTitle: {
        fontSize: 24,
        bold: true,
        alignment: "center"
      },
      heading1: {
        fontSize: 18,
        bold: true,
        alignment: "center"
      },
      weekTitle: {
        fontSize: 12,
        bold: true
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: "#111827"
      }
    },
    defaultStyle: {
      font: "Roboto",
      fontSize: 10
    }
  };

  // 5. Generate PDF Buffer
  const pdfDoc = pdfMake.createPdf(docDefinition);
  const buffer = await pdfDoc.getBuffer();
  return buffer;
}
