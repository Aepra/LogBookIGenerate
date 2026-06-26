const fs = require('fs');
let content = fs.readFileSync('src/components/features/LogbookReviewClient.tsx', 'utf8');
// Remove literal \r (backslash + r) before line endings
const before = content.length;
content = content.split('\\r\r\n').join('\r\n');
content = content.split('\\r\n').join('\n');  // also fix if only \r without extra \r\n
const after = content.length;
fs.writeFileSync('src/components/features/LogbookReviewClient.tsx', content, 'utf8');
console.log('Fixed: removed ' + (before - after) + ' chars');
