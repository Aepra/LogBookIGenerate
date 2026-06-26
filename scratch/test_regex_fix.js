const fs = require('fs');

let xml = fs.readFileSync('scratch/debug_original.xml', 'utf8');

xml = xml.replace(/<w:tc>(?:(?!<w:tc>).)*?@@VMERGE_RESTART@@/gs, function(match) {
    let replaced = match;
    if (replaced.includes("</w:tcPr>")) {
        replaced = replaced.replace("</w:tcPr>", '<w:vMerge w:val="restart"/></w:tcPr>');
    } else if (replaced.includes("<w:tcPr/>")) {
        replaced = replaced.replace("<w:tcPr/>", '<w:tcPr><w:vMerge w:val="restart"/></w:tcPr>');
    }
    return replaced.replace("@@VMERGE_RESTART@@", "");
});

xml = xml.replace(/<w:tc>(?:(?!<w:tc>).)*?@@VMERGE_CONTINUE@@(?:(?!<\/w:tc>).)*?<\/w:tc>/gs, function(match) {
    const tcPrMatch = match.match(/<w:tcPr\b[^>]*>(.*?)<\/w:tcPr>/s) || match.match(/<w:tcPr\/>/);
    let newTcPr = '<w:tcPr><w:vMerge w:val="continue"/></w:tcPr>';
    if (tcPrMatch) {
        if (tcPrMatch[0] === "<w:tcPr/>") {
            newTcPr = '<w:tcPr><w:vMerge w:val="continue"/></w:tcPr>';
        } else {
            newTcPr = tcPrMatch[0].replace("</w:tcPr>", '<w:vMerge w:val="continue"/></w:tcPr>');
        }
    }
    return `<w:tc>${newTcPr}<w:p/></w:tc>`;
});

console.log("Found w:vMerge:", xml.includes("w:vMerge"));
fs.writeFileSync('scratch/debug_modified.xml', xml);
