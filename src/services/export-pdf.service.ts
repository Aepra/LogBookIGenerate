/**
 * Export PDF Service
 * ==================
 * Generates a PDF from the filled DOCX template using LibreOffice headless conversion.
 * This preserves the template layout exactly, unlike a pdfmake-generated PDF.
 *
 * Requires LibreOffice to be installed at a known location.
 */

import { execSync, exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { generateLogbookDocx } from "./export-docx.service";

/**
 * Find the LibreOffice executable on this system.
 */
function findLibreOffice(): string | null {
  // Common installation paths on Windows
  const candidates = [
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files\\LibreOffice\\program\\soffice.com",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com",
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Try PATH
  try {
    const result = execSync("where soffice 2>nul", {
      encoding: "utf-8",
      windowsHide: true,
    }).trim();
    if (result) return result;
  } catch {
    // not in PATH
  }

  return null;
}

/**
 * Validate that LibreOffice is available.
 * Throws if not found.
 */
function validateLibreOffice(): string {
  const lo = findLibreOffice();
  if (!lo) {
    throw new Error(
      "LibreOffice tidak ditemukan. PDF export memerlukan LibreOffice. " +
      "Silakan install LibreOffice dari https://www.libreoffice.org/"
    );
  }
  return lo;
}

/**
 * Convert a DOCX buffer to PDF using LibreOffice headless conversion.
 */
async function convertDocxToPdf(
  docxBuffer: Buffer,
  libreOfficePath: string
): Promise<Buffer> {
  // Write the DOCX to a temp file
  const tmpDir = path.resolve(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const inputPath = path.join(tmpDir, `logbook_temp_${Date.now()}.docx`);
  const outputDir = tmpDir; // LibreOffice writes output to same dir

  try {
    fs.writeFileSync(inputPath, docxBuffer);

    // Execute LibreOffice headless conversion
    await new Promise<void>((resolve, reject) => {
      exec(
        `"${libreOfficePath}" --headless --convert-to pdf --outdir "${outputDir}" "${inputPath}"`,
        { windowsHide: true, timeout: 60000 },
        (error, stdout, stderr) => {
          if (error) {
            console.error("[Export PDF] LibreOffice stderr:", stderr);
            reject(new Error(`LibreOffice conversion gagal: ${error.message}`));
            return;
          }
          resolve();
        }
      );
    });

    // Read the converted PDF
    const pdfPath = inputPath.replace(/\.docx$/, ".pdf");
    if (!fs.existsSync(pdfPath)) {
      throw new Error("LibreOffice tidak menghasilkan file PDF.");
    }

    const pdfBuffer = fs.readFileSync(pdfPath);

    // Cleanup temp files
    try { fs.unlinkSync(inputPath); } catch { /* ignore */ }
    try { fs.unlinkSync(pdfPath); } catch { /* ignore */ }

    return pdfBuffer;
  } catch (err) {
    // Cleanup on error too
    try { fs.unlinkSync(inputPath); } catch { /* ignore */ }
    const pdfPath = inputPath.replace(/\.docx$/, ".pdf");
    try { fs.unlinkSync(pdfPath); } catch { /* ignore */ }
    throw err;
  }
}

// ─────────────────────────────────────
//  MAIN EXPORT FUNCTION
// ─────────────────────────────────────

export async function generateLogbookPdf(params: {
  logbook: any;
  activities: any[];
  user: any;
  accessToken: string;
}): Promise<Buffer> {
  // Step 1: Validate LibreOffice is available (early error)
  const libreOfficePath = validateLibreOffice();

  // Step 2: Generate the filled DOCX using the same template-based service
  const docxBuffer = await generateLogbookDocx(params);

  // Step 3: Convert DOCX to PDF via LibreOffice
  const pdfBuffer = await convertDocxToPdf(docxBuffer, libreOfficePath);

  return pdfBuffer;
}
