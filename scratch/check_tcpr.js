const fs = require('fs');
let xml = fs.readFileSync('scratch/debug_original.xml', 'utf8');

const matches = xml.match(/<w:tcPr\b[^>]*>.*?<\/w:tcPr>/gs);
if(matches) {
   for (let i = 0; i < Math.min(10, matches.length); i++) {
      console.log(matches[i]);
   }
}
