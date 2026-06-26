const fs = require('fs');

let xml = `
<w:tr>
  <w:tc>
    <w:tcPr>
      <w:tcW w:w="1000" w:type="dxa"/>
    </w:tcPr>
    <w:p>
      <w:r><w:t>@@VMERGE_RESTART@@Senin</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>1 Jan 2024</w:t></w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="2000"/></w:tcPr>
    <w:p><w:t>Activity A</w:t></w:p>
  </w:tc>
</w:tr>
<w:tr>
  <w:tc>
    <w:tcPr>
      <w:tcW w:w="1000" w:type="dxa"/>
    </w:tcPr>
    <w:p>
      <w:r><w:t>@@VMERGE_CONTINUE@@</w:t></w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="2000"/></w:tcPr>
    <w:p><w:t>Activity B</w:t></w:p>
  </w:tc>
</w:tr>
`;

xml = xml.replace(/<w:tc>(?:(?!<w:tc>).)*?@@VMERGE_RESTART@@/gs, function(match) {
    return match.replace("</w:tcPr>", '<w:vMerge w:val="restart"/></w:tcPr>').replace("@@VMERGE_RESTART@@", "");
});

xml = xml.replace(/<w:tc>(?:(?!<w:tc>).)*?@@VMERGE_CONTINUE@@(?:(?!<\/w:tc>).)*?<\/w:tc>/gs, function(match) {
    const tcPrMatch = match.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/);
    let newTcPr = "<w:tcPr></w:tcPr>";
    if (tcPrMatch) {
        newTcPr = tcPrMatch[0].replace("</w:tcPr>", '<w:vMerge w:val="continue"/></w:tcPr>');
    }
    return `<w:tc>${newTcPr}<w:p/></w:tc>`;
});

console.log(xml);
