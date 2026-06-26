const fs = require('fs');

let xml = fs.readFileSync('scratch/debug_original.xml', 'utf8');

// 1. Center vertically for all cells
// We will look for <w:tcPr> or <w:tcPr/> and inject <w:vAlign w:val="center"/>
xml = xml.replace(/<w:tcPr\b[^>]*>(.*?)<\/w:tcPr>/g, function(match, inner) {
    let newInner = inner.replace(/<w:vAlign\b[^>]*\/>/g, ""); // remove existing vAlign
    return `<w:tcPr><w:vAlign w:val="center"/>${newInner}</w:tcPr>`;
});
xml = xml.replace(/<w:tcPr\/>/g, '<w:tcPr><w:vAlign w:val="center"/></w:tcPr>');

// 2. Center horizontally for paragraphs containing images
xml = xml.replace(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g, function(match, inner) {
    if (inner.includes("<w:drawing>") || inner.includes("<v:imagedata")) {
        // It's an image paragraph!
        // We need to inject <w:jc w:val="center"/> into <w:pPr>
        let pPrMatch = match.match(/<w:pPr\b[^>]*>(.*?)<\/w:pPr>/s) || match.match(/<w:pPr\/>/);
        let newPPr = '<w:pPr><w:jc w:val="center"/></w:pPr>';
        if (pPrMatch) {
            if (pPrMatch[0] === "<w:pPr/>") {
                newPPr = '<w:pPr><w:jc w:val="center"/></w:pPr>';
            } else {
                let innerPPr = pPrMatch[1].replace(/<w:jc\b[^>]*\/>/g, ""); // remove existing jc
                newPPr = `<w:pPr><w:jc w:val="center"/>${innerPPr}</w:pPr>`;
            }
            return match.replace(pPrMatch[0], newPPr);
        } else {
            // No pPr exists, we must add it right after <w:p ...>
            return match.replace(/(<w:p\b[^>]*>)/, `$1${newPPr}`);
        }
    }
    return match;
});

// Write to check
fs.writeFileSync('scratch/debug_align.xml', xml);
console.log("Done. Check debug_align.xml");
