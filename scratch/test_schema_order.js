const fs = require('fs');
const xml = fs.readFileSync('scratch/debug_original.xml', 'utf8');

// Find all <w:tcPr>
const matches = xml.match(/<w:tcPr\b[^>]*>(.*?)<\/w:tcPr>/g);
if (matches) {
    for (let i = 0; i < 5 && i < matches.length; i++) {
        console.log(`Match ${i}: ${matches[i]}`);
    }
} else {
    console.log("No w:tcPr found");
}

const pPrMatches = xml.match(/<w:pPr\b[^>]*>(.*?)<\/w:pPr>/g);
if (pPrMatches) {
    for (let i = 0; i < 5 && i < pPrMatches.length; i++) {
        console.log(`pPr Match ${i}: ${pPrMatches[i]}`);
    }
}
