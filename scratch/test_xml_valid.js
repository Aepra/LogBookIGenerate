const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');

const xml = fs.readFileSync('scratch/debug_red_bg.xml', 'utf8');

const parser = new DOMParser({
    locator: {},
    onError: function(level, msg) { console.error(level, msg); }
});

const doc = parser.parseFromString(xml, 'text/xml');
console.log("Parsed!");
