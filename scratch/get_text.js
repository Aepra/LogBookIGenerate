const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const templateContent = fs.readFileSync('template/template_logbook.docx', 'binary');
const zip = new PizZip(templateContent);

const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
});

const text = doc.getFullText();
console.log(text);
