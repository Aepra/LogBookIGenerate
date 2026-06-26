const fs = require('fs');
// Write a test harness for the exact logic
try {
  let xml = fs.readFileSync('scratch/debug_original.xml', 'utf8');

  xml = xml.replace(/<w:tr[\s\S]*?<\/w:tr>/g, function(trMatch) {
    if (trMatch.includes("@@RED_BG@@")) {
      let newTr = trMatch.replace(/@@RED_BG@@/g, "");
      newTr = newTr.replace(/<w:tcPr\b[^>]*>(?<!\/>)(.*?)<\/w:tcPr>/gs, function(tcPrMatch, inner) {
        let innerClean = inner.replace(/<w:shd\b[^>]*\/>/g, "");
        const match = innerClean.match(/<(w:vAlign|w:hideMark|w:headers)/);
        if (match) {
          innerClean = innerClean.replace(match[0], '<w:shd w:fill="FFCCCC" w:val="clear"/>' + match[0]);
        } else {
          innerClean = innerClean + '<w:shd w:fill="FFCCCC" w:val="clear"/>';
        }
        return `<w:tcPr>${innerClean}</w:tcPr>`;
      });
      newTr = newTr.replace(/<w:tcPr\/>/g, '<w:tcPr><w:shd w:fill="FFCCCC" w:val="clear"/></w:tcPr>');
      return newTr;
    }
    return trMatch;
  });
  console.log("Regex succeeded");
} catch(e) {
  console.error("Error", e);
}
