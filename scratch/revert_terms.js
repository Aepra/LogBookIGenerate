const fs = require('fs');

const translations = {
  'Buku Log': 'Logbook',
  'buku log': 'logbook',
  'Dasbor': 'Dashboard'
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  
  for (const [id, en] of Object.entries(translations)) {
    newContent = newContent.split(id).join(en);
  }
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedCount++;
    console.log('Updated:', file);
  }
});

console.log('Total files updated:', changedCount);
