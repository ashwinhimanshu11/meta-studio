const fs = require('fs');

let index = fs.readFileSync('index.html', 'utf-8');
let editor = fs.readFileSync('js/editor.js', 'utf-8');
let video = fs.readFileSync('js/video-editor.js', 'utf-8');

// 1. Fix IDs in editor.js
editor = editor.replace(/getElementById\(['"]editor-image['"]\)/g, "getElementById('editor-preview-img')");
editor = editor.replace(/getElementById\(['"]filename-display['"]\)/g, "getElementById('editor-filename-display')");

// 2. Fix IDs in video-editor.js
video = video.replace(/getElementById\(['"]editor-video['"]\)/g, "getElementById('video-preview-vid')");
video = video.replace(/getElementById\(['"]filename-display['"]\)/g, "getElementById('video-filename-display')");
video = video.replace(/getElementById\(['"]editor-container-main['"]\)/g, "getElementById('video-preview-container')");

// 3. Add missing elements to index.html
if (!index.includes('status-toast')) {
    index = index.replace('</body>', '<div id="status-toast"></div>\n</body>');
}

// Add filename display if missing
if (!index.includes('editor-filename-display')) {
    index = index.replace('<h3 style="margin: 0 0 10px 0; font-size: 15px; color: var(--text-main);">Edit Options</h3>', 
        '<h3 style="margin: 0 0 10px 0; font-size: 15px; color: var(--text-main);">Edit Options</h3>\n<div id="editor-filename-display" style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px; word-break: break-all;"></div>');
}
if (!index.includes('video-filename-display')) {
    index = index.replace('<h3 style="margin: 0 0 10px 0; font-size: 15px; color: var(--text-main);">Video Edit Options</h3>', 
        '<h3 style="margin: 0 0 10px 0; font-size: 15px; color: var(--text-main);">Video Edit Options</h3>\n<div id="video-filename-display" style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px; word-break: break-all;"></div>');
}

// Add blur modal if missing
if (!index.includes('blur-time-modal')) {
    const blurModal = `
    <!-- Blur Timeframe Modal -->
    <div id="blur-time-modal" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 2000; align-items: center; justify-content: center;">
      <div style="background: var(--bg-panel); padding: 20px; border-radius: 8px; width: 300px; border: 1px solid var(--border-color); color: var(--text-main);">
        <h3 style="margin-top: 0;">Blur Timeframe</h3>
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
          <div style="flex: 1;">
            <label style="font-size: 11px; color: var(--text-muted);">Start (s)</label>
            <input type="number" id="blur-start" style="width: 100%; box-sizing: border-box; padding: 6px; background: var(--bg-base); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 4px;" step="0.1">
          </div>
          <div style="flex: 1;">
            <label style="font-size: 11px; color: var(--text-muted);">End (s)</label>
            <input type="number" id="blur-end" style="width: 100%; box-sizing: border-box; padding: 6px; background: var(--bg-base); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 4px;" step="0.1">
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button id="btn-cancel-blur-time" class="action-btn">Cancel</button>
          <button id="btn-confirm-blur-time" class="action-btn primary">Confirm</button>
        </div>
      </div>
    </div>
    `;
    index = index.replace('</body>', blurModal + '\n</body>');
}

// Wait, proxy progress elements were also missing in video-editor.js
// 'proxy-progress-bar', 'proxy-text'
// In video-editor.js, it injects an overlay, but it searches for them globally before injecting?
// Ah, let's check video-editor.js.
// It creates them dynamically using overlay.innerHTML = ...
// So they don't exist ON LOAD. If the code does document.getElementById("proxy-progress-bar") at the top level, it crashes!
// Let's check video-editor.js to see if it accesses them at the top level.

fs.writeFileSync('index.html', index);
fs.writeFileSync('js/editor.js', editor);
fs.writeFileSync('js/video-editor.js', video);

console.log("Fixes applied");
