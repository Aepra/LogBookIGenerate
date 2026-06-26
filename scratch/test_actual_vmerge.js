const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module');

// Monkey patch
const scopeManagerFactory = require("docxtemplater/js/scope-manager");
const dummy = scopeManagerFactory({ tags: {} });
const ScopeManagerProto = Object.getPrototypeOf(dummy);
const originalGetValue = ScopeManagerProto.getValue;
ScopeManagerProto.getValue = function(tag, meta) {
if (!meta) {
    meta = { part: { type: "placeholder", value: tag } };
}
return originalGetValue.call(this, tag, meta);
};

const templateContent = fs.readFileSync('template/template_logbook.docx', 'binary');
const zip = new PizZip(templateContent);

const imageModule = new ImageModule({
    getImage: () => Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", "base64"),
    getSize: () => [150, 110]
});

const doc = new Docxtemplater(zip, {
    modules: [imageModule],
    paragraphLoop: true,
    linebreaks: true,
});

doc.render({
    name: "Test",
    nim: "123",
    activities: [
        {
            no: "@@VMERGE_RESTART@@1.",
            hari: "@@VMERGE_RESTART@@Senin",
            tanggal: "19-01-2026",
            durasi: "60",
            waktu: "10:00",
            kegiatan: "Test",
            kendala: "Test",
            foto: "placeholder"
        },
        {
            no: "@@VMERGE_CONTINUE@@",
            hari: "@@VMERGE_CONTINUE@@",
            tanggal: "",
            durasi: "60",
            waktu: "11:00",
            kegiatan: "Test 2",
            kendala: "Test 2",
            foto: "placeholder"
        }
    ]
});

let xml = doc.getZip().file("word/document.xml").asText();
fs.writeFileSync('scratch/debug_original.xml', xml);
console.log("Original XML length:", xml.length);
console.log("Found VMERGE_RESTART:", xml.includes("@@VMERGE_RESTART@@"));

  // 1. Process VMERGE_RESTART
  xml = xml.replace(/<w:tc>(?:(?!<w:tc>).)*?@@VMERGE_RESTART@@/gs, function(match) {
    return match.replace("</w:tcPr>", '<w:vMerge w:val="restart"/></w:tcPr>').replace("@@VMERGE_RESTART@@", "");
  });

  // 2. Process VMERGE_CONTINUE
  xml = xml.replace(/<w:tc>(?:(?!<w:tc>).)*?@@VMERGE_CONTINUE@@(?:(?!<\/w:tc>).)*?<\/w:tc>/gs, function(match) {
    const tcPrMatch = match.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/);
    let newTcPr = "<w:tcPr></w:tcPr>";
    if (tcPrMatch) {
      newTcPr = tcPrMatch[0].replace("</w:tcPr>", '<w:vMerge w:val="continue"/></w:tcPr>');
    }
    return `<w:tc>${newTcPr}<w:p/></w:tc>`;
  });

fs.writeFileSync('scratch/debug_modified.xml', xml);
console.log("Modified XML length:", xml.length);
console.log("Found w:vMerge:", xml.includes("w:vMerge"));
