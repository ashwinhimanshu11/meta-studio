const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('index.html', 'utf-8');
const dom = new JSDOM(html);
const document = dom.window.document;

function checkFile(filename) {
    const code = fs.readFileSync(filename, 'utf-8');
    let nullIds = [];
    // find all getElementById calls
    const matches = code.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g);
    for (const match of matches) {
        const id = match[1];
        if (!document.getElementById(id)) {
            if (!nullIds.includes(id)) {
                nullIds.push(id);
            }
        }
    }
    console.log(`Missing IDs in ${filename}:`, nullIds);
}

checkFile('js/editor.js');
checkFile('js/video-editor.js');
