const fs = require('fs');

const xml = `
<w:tr>
  <w:tc><w:tcPr/><w:p><w:r><w:t>@@RED_BG@@</w:t></w:r></w:p></w:tc>
  <w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr><w:p><w:r><w:t>Senin</w:t></w:r></w:p></w:tc>
</w:tr>
<w:tr>
  <w:tc><w:tcPr/><w:p><w:r><w:t>Normal</w:t></w:r></w:p></w:tc>
</w:tr>
`;

let result = xml.replace(/<w:tr[\s\S]*?<\/w:tr>/g, function(trMatch) {
    if (trMatch.includes("@@RED_BG@@")) {
        // Remove the marker
        let newTr = trMatch.replace("@@RED_BG@@", "");
        // Inject w:shd into every tcPr
        newTr = newTr.replace(/<w:tcPr\b[^>]*>(?<!\/>)(.*?)<\/w:tcPr>/s, function(tcPrMatch, inner) {
            // this matches only the first? Wait, I need /g
            return 'matched';
        });
        
        newTr = newTr.replace(/<w:tcPr\b[^>]*>(?<!\/>)(.*?)<\/w:tcPr>/gs, function(tcPrMatch, inner) {
            let innerClean = inner.replace(/<w:shd\b[^>]*\/>/g, "");
            return `<w:tcPr>${innerClean}<w:shd w:fill="FF0000" w:val="clear"/></w:tcPr>`;
        });
        newTr = newTr.replace(/<w:tcPr\/>/g, '<w:tcPr><w:shd w:fill="FF0000" w:val="clear"/></w:tcPr>');
        return newTr;
    }
    return trMatch;
});

console.log(result);
