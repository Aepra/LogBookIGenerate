const fs = require('fs');
let xml = fs.readFileSync('scratch/debug_red_bg.xml', 'utf8');
const matches = xml.match(/<w:tcPr\b[^>]*>.*?<\/w:tcPr>/gs);
if (matches) {
   let c = 0;
   for (let m of matches) {
      if (m.includes('FFCCCC')) {
         console.log(m);
         c++;
         if (c > 5) break;
      }
   }
}
