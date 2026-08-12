const fs = require('fs');
let index = fs.readFileSync('index.html', 'utf-8');

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

// Remove it if it exists in a broken state
index = index.replace(/<!-- Blur Timeframe Modal -->[\s\S]*?btn-confirm-blur-time.*<\/div>\s*<\/div>\s*<\/div>/, '');
index = index.replace('</body>', blurModal + '\n</body>');

fs.writeFileSync('index.html', index);
console.log("Modal forced.");
