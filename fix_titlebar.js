const fs = require('fs');

// 1. Update main.js
let main = fs.readFileSync('main.js', 'utf8');
main = main.replace(/minHeight: 600,/g, 'minHeight: 600,\n    frame: false,');
// Add IPC listeners for window controls
if (!main.includes("ipcMain.on('window-minimize'")) {
  main += `
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});
ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }
});
ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});
`;
}
fs.writeFileSync('main.js', main);

// 2. Update preload.js
let preload = fs.readFileSync('preload.js', 'utf8');
if (!preload.includes("windowMinimize")) {
  preload = preload.replace(/contextBridge\.exposeInMainWorld\("electronAPI", \{/, 'contextBridge.exposeInMainWorld("electronAPI", {\n  windowMinimize: () => ipcRenderer.send("window-minimize"),\n  windowMaximize: () => ipcRenderer.send("window-maximize"),\n  windowClose: () => ipcRenderer.send("window-close"),');
  fs.writeFileSync('preload.js', preload);
}

// 3. Update HTML files
const titlebarHTML = `
    <!-- Custom Titlebar -->
    <div style="height: 32px; width: 100%; background: var(--bg-base); display: flex; justify-content: space-between; align-items: center; -webkit-app-region: drag; border-bottom: 1px solid var(--border-color); user-select: none; flex-shrink: 0;">
      <div style="padding-left: 12px; font-size: 12px; color: var(--text-muted); font-weight: 500; font-family: 'Poppins', sans-serif;">Meta Studio</div>
      <div style="display: flex; height: 100%; -webkit-app-region: no-drag;">
        <button onclick="window.electronAPI.windowMinimize()" style="width: 46px; height: 100%; background: transparent; border: none; color: var(--text-main); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'"><span class="material-symbols-rounded" style="font-size: 16px;">minimize</span></button>
        <button onclick="window.electronAPI.windowMaximize()" style="width: 46px; height: 100%; background: transparent; border: none; color: var(--text-main); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'"><span class="material-symbols-rounded" style="font-size: 14px;">crop_square</span></button>
        <button onclick="window.electronAPI.windowClose()" style="width: 46px; height: 100%; background: transparent; border: none; color: var(--text-main); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background='#e81123'; this.style.color='#fff'" onmouseout="this.style.background='transparent'; this.style.color='var(--text-main)'"><span class="material-symbols-rounded" style="font-size: 18px;">close</span></button>
      </div>
    </div>
`;

['index.html', 'image-editor-window.html', 'video-editor-window.html', 'exif-window.html'].forEach(file => {
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('Custom Titlebar')) {
    html = html.replace('<body>', '<body>\n' + titlebarHTML);
    fs.writeFileSync(file, html);
  }
});
console.log("Titlebar applied.");
