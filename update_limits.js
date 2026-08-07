const fs = require('fs');
let main = fs.readFileSync('main.js', 'utf8');

main = main.replace(
  'const exifWin = new BrowserWindow({\n    width: 600,\n    height: 700,',
  'const exifWin = new BrowserWindow({\n    width: 600,\n    height: 700,\n    minWidth: 500,\n    minHeight: 600,'
);

main = main.replace(
  'const editorWin = new BrowserWindow({\n    width: 900,\n    height: 700,',
  'const editorWin = new BrowserWindow({\n    width: 900,\n    height: 700,\n    minWidth: 800,\n    minHeight: 600,'
);

main = main.replace(
  'const videoWin = new BrowserWindow({\n    width: 900,\n    height: 700,',
  'const videoWin = new BrowserWindow({\n    width: 900,\n    height: 700,\n    minWidth: 800,\n    minHeight: 600,'
);

fs.writeFileSync('main.js', main);
console.log("Window limits updated.");
