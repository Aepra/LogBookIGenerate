const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');

function injectIntoTcPr(tcPrInner, tagToInject, isVMerge) {
    let result = tcPrInner;
    if (isVMerge) {
        result = result.replace(/<w:vMerge\b[^>]*\/>/g, "");
        const match = result.match(/<(w:tcBorders|w:shd|w:vAlign|w:hideMark|w:headers)/);
        if (match) {
            result = result.replace(match[0], tagToInject + match[0]);
        } else {
            result = result + tagToInject;
        }
    } else {
        result = result.replace(/<w:vAlign\b[^>]*\/>/g, "");
        const match = result.match(/<(w:hideMark|w:headers)/);
        if (match) {
            result = result.replace(match[0], tagToInject + match[0]);
        } else {
            result = result + tagToInject;
        }
    }
    return result;
}

function injectIntoPPr(pPrInner, tagToInject) {
    let result = pPrInner.replace(/<w:jc\b[^>]*\/>/g, "");
    const match = result.match(/<(w:rPr|w:sectPr|w:pPrChange)/);
    if (match) {
        result = result.replace(match[0], tagToInject + match[0]);
    } else {
        result = result + tagToInject;
    }
    return result;
}

let xml = fs.readFileSync('scratch/debug_original.xml', 'utf8');

// 1. VMERGE_RESTART
xml = xml.replace(/<w:tc>(?:(?!<w:tc>).)*?@@VMERGE_RESTART@@/gs, function(match) {
    let replaced = match;
    const tcPrMatch = replaced.match(/<w:tcPr\b[^>]*>(?<!\/>)(.*?)<\/w:tcPr>/s) || replaced.match(/<w:tcPr\/>/);
    if (tcPrMatch) {
        let inner = tcPrMatch[0] === "<w:tcPr/>" ? "" : tcPrMatch[1];
        inner = injectIntoTcPr(inner, '<w:vMerge w:val="restart"/>', true);
        replaced = replaced.replace(tcPrMatch[0], `<w:tcPr>${inner}</w:tcPr>`);
    } else {
        replaced = replaced.replace("<w:tc>", `<w:tc><w:tcPr><w:vMerge w:val="restart"/></w:tcPr>`);
    }
    return replaced.replace("@@VMERGE_RESTART@@", "");
});

// 2. VMERGE_CONTINUE
xml = xml.replace(/<w:tc>(?:(?!<w:tc>).)*?@@VMERGE_CONTINUE@@(?:(?!<\/w:tc>).)*?<\/w:tc>/gs, function(match) {
    const tcPrMatch = match.match(/<w:tcPr\b[^>]*>(?<!\/>)(.*?)<\/w:tcPr>/s) || match.match(/<w:tcPr\/>/);
    let newTcPr = '<w:tcPr><w:vMerge w:val="continue"/></w:tcPr>';
    if (tcPrMatch) {
        let inner = tcPrMatch[0] === "<w:tcPr/>" ? "" : tcPrMatch[1];
        inner = injectIntoTcPr(inner, '<w:vMerge w:val="continue"/>', true);
        newTcPr = `<w:tcPr>${inner}</w:tcPr>`;
    }
    return `<w:tc>${newTcPr}<w:p/></w:tc>`;
});

// 3. VERTICAL ALIGN CENTER FOR ALL CELLS
xml = xml.replace(/<w:tcPr\b[^>]*>(?<!\/>)(.*?)<\/w:tcPr>/gs, function(match, inner) {
    return `<w:tcPr>${injectIntoTcPr(inner, '<w:vAlign w:val="center"/>', false)}</w:tcPr>`;
});
xml = xml.replace(/<w:tcPr\/>/g, '<w:tcPr><w:vAlign w:val="center"/></w:tcPr>');

// 4. HORIZONTAL ALIGN FOR IMAGES
xml = xml.replace(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g, function(match, inner) {
    if (inner.includes("<w:drawing>") || inner.includes("<v:imagedata")) {
        const pPrMatch = match.match(/<w:pPr\b[^>]*>(?<!\/>)(.*?)<\/w:pPr>/s) || match.match(/<w:pPr\/>/);
        let newPPr = '<w:pPr><w:jc w:val="center"/></w:pPr>';
        if (pPrMatch) {
            let innerPPr = pPrMatch[0] === "<w:pPr/>" ? "" : pPrMatch[1];
            innerPPr = injectIntoPPr(innerPPr, '<w:jc w:val="center"/>');
            newPPr = `<w:pPr>${innerPPr}</w:pPr>`;
            return match.replace(pPrMatch[0], newPPr);
        } else {
            return match.replace(/(<w:p\b[^>]*>)/, `$1${newPPr}`);
        }
    }
    return match;
});

const parser = new DOMParser({
    onError: (level, msg) => {
        if(level === 'error' || level === 'fatalError') {
            console.log("XML ERROR:", msg);
        }
    }
});
try {
    const doc = parser.parseFromString(xml, 'text/xml');
    console.log("Successfully parsed XML!");
} catch (e) {
    console.log("Parse failed", e.message);
}
