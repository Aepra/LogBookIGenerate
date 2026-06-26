// Direct pdfkit approach - simpler and more reliable
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'A4',
  layout: 'landscape',
  margins: { top: 30, bottom: 30, left: 30, right: 30 }
});

// Pipe to file
const writeStream = fs.createWriteStream(path.resolve(__dirname, '../tmp/test_pdfkit.pdf'));
doc.pipe(writeStream);

// Title
doc.fontSize(16).font('Helvetica-Bold')
   .text('LAPORAN LOGBOOK KEGIATAN', { align: 'center' });
doc.moveDown(2);

// Info
doc.fontSize(10).font('Helvetica')
   .text('Nama: John Doe', { continued: false });
doc.moveDown(0.5);
doc.text('NIM: D121201234');
doc.moveDown(0.5);
doc.text('Universitas: UNIVERSITAS HASANUDDIN');
doc.moveDown(2);

// Table header
const tableTop = doc.y;
const colWidths = [30, 80, 40, 50, 150, 100, 80];
const headers = ['No', 'Hari & Tgl', 'Durasi', 'Waktu', 'Kegiatan', 'Kendala', 'Foto'];

let xPos = doc.page.margins.left;
doc.fontSize(8).font('Helvetica-Bold');
headers.forEach((h, i) => {
  doc.text(h, xPos, tableTop, { width: colWidths[i], align: 'center' });
  xPos += colWidths[i];
});

// Draw header line
doc.moveTo(doc.page.margins.left, tableTop + 15)
   .lineTo(doc.page.margins.left + colWidths.reduce((a, b) => a + b, 0), tableTop + 15)
   .stroke();

// Row
const rowY = tableTop + 20;
xPos = doc.page.margins.left;
doc.fontSize(7).font('Helvetica');
const rowData = ['1', 'Senin, 1 Jan 2024', '60 mnt', '08:00 - 10:00', 'Meeting dengan tim', 'Tidak ada', '-'];
rowData.forEach((val, i) => {
  doc.text(val, xPos, rowY, { width: colWidths[i], align: i === 0 || i === 2 || i === 3 ? 'center' : 'left' });
  xPos += colWidths[i];
});

doc.end();

writeStream.on('finish', () => {
  console.log('PDF saved to tmp/test_pdfkit.pdf');
});
