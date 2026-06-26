const fs = require('fs');
const PizZip = require('pizzip');

const templatePath = 'template/template_logbook.docx';
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);

let xml = zip.file('word/document.xml').asText();

if (xml.includes('{#weeks}')) {
    console.log('Template already has {#weeks}');
    process.exit(0);
}

const tblMatch = xml.match(/<w:tbl>(?:(?!<w:tbl>).)*?{#activities}.*?<\/w:tbl>/s);

if (tblMatch) {
    console.log("Found activities table.");
    let tbl = tblMatch[0];
    
    const beforeTable = `
<w:p><w:r><w:t>{#weeks}</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Pekan {week_number}</w:t></w:r></w:p>
<w:p/>
`;
    
    // We will create 7 grid units total.
    // First cell spans 5 units (No, Hari, Durasi, Waktu, Kegiatan)
    // Wait, the user has Durasi as column 3! No, column 6 in the new layout?
    // User's columns: No, Hari/Tanggal, Waktu, Kegiatan, Kendala, Durasi, Dokumentasi. (Total 7)
    // Wait, let's just make it span 5 units, and the 2nd cell spans 2 units.
    
    const newRow = `
<w:tr>
  <w:tc>
    <w:tcPr><w:gridSpan w:val="5"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="right"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Total Durasi Pekan Ini:</w:t></w:r></w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:gridSpan w:val="2"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>{total_duration}</w:t></w:r></w:p>
  </w:tc>
</w:tr>`;
    
    tbl = tbl.replace(/<\/w:tbl>$/, newRow + '</w:tbl>');
    
    const afterTable = `
<w:p><w:r><w:t>{/weeks}</w:t></w:r></w:p>
<w:p/>
`;

    const newTbl = beforeTable.trim().replace(/\n/g, "") + tbl + afterTable.trim().replace(/\n/g, "");
    
    xml = xml.replace(tblMatch[0], newTbl);
    
    zip.file('word/document.xml', xml);
    const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    fs.writeFileSync(templatePath, buf);
    console.log("Successfully patched template_logbook.docx with 7 grid units");
} else {
    console.log("Could not find table containing {#activities}");
}
