const PizZip = require('pizzip');
const fs = require('fs');
const content = fs.readFileSync('template/template_logbook.docx', 'binary');
const zip = new PizZip(content);
const xml = zip.file('word/document.xml').asText();
const tblMatch = xml.match(/<w:tbl>(?:(?!<w:tbl>).)*?{#activities}.*?<\/w:tbl>/s);
if (tblMatch) {
   const trRegex = /<w:tr[\s\S]*?<\/w:tr>/g;
   const trs = tblMatch[0].match(trRegex);
   const lastRow = trs[trs.length - 1];
   const tcs = lastRow.match(/<w:tc>.*?<\/w:tc>/gs) || lastRow.match(/<w:tc\b[^>]*>.*?<\/w:tc>/gs);
   console.log('Cells:', tcs ? tcs.length : 0);
   let totalGrid = 0;
   tcs.forEach((tc, i) => {
       const gridSpan = tc.match(/<w:gridSpan w:val="(\d+)"/);
       const span = gridSpan ? parseInt(gridSpan[1]) : 1;
       totalGrid += span;
       console.log('Cell', i, 'gridSpan:', span);
   });
   console.log('Total grid columns used:', totalGrid);
}
