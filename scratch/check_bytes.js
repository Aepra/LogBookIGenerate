const fs = require('fs');
const buf = fs.readFileSync('src/components/features/LogbookReviewClient.tsx');
const lines = buf.toString('utf8').split('\n');
for (let i = 335; i < 340; i++) {
  const line = lines[i];
  const last5 = [];
  for (let j = Math.max(0, line.length - 5); j < line.length; j++) {
    last5.push(line.charCodeAt(j).toString(16));
  }
  console.log('Line ' + (i+1) + ' ends: [' + last5.join(',') + '] chars: ' + JSON.stringify(line.slice(-5)));
}
