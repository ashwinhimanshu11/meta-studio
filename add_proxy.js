const fs = require('fs');
let main = fs.readFileSync('main.js', 'utf8');

const code = `
// ==========================================
// VIDEO PROXY SYSTEM
// ==========================================
ipcMain.handle("prepare-video-proxy", async (event, filePath) => {
  const os = require('os');
  const path = require('path');
  const ext = path.extname(filePath).toLowerCase();
  
  // Natively supported by Chromium (mostly)
  if (['.mp4', '.webm', '.ogg'].includes(ext)) {
    return { proxyPath: filePath }; // Try to load directly
  }
  
  return new Promise((resolve) => {
    const proxyPath = path.join(os.tmpdir(), "meta_studio_proxy_" + Date.now() + ".mp4");
    const ffmpegPath = getBundledBinaryPath("ffmpeg");
    
    // Transcode to fast MP4 for preview
    const args = [
      "-i", filePath,
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "28", // lower quality, higher speed
      "-c:a", "aac",
      "-b:a", "128k",
      "-y",
      proxyPath
    ];
    
    let totalDurationSec = 0;
    const child = execFile(ffmpegPath, args, (error) => {
      activeChildProcesses.delete(child);
      if (cancelCurrentTask) {
        resolve({ error: "Cancelled" });
      } else if (error) {
        resolve({ error: "Preview generation failed." });
      } else {
        resolve({ proxyPath: proxyPath });
      }
    });
    
    activeChildProcesses.add(child);
    
    child.stderr.on("data", (data) => {
      const str = data.toString();
      if (!totalDurationSec) {
        const durMatch = str.match(/Duration: (\\d{2}):(\\d{2}):(\\d{2}\\.\\d{2})/);
        if (durMatch) {
          totalDurationSec =
            parseInt(durMatch[1]) * 3600 +
            parseInt(durMatch[2]) * 60 +
            parseFloat(durMatch[3]);
        }
      }
      const timeMatch = str.match(/time=(\\d{2}):(\\d{2}):(\\d{2}\\.\\d{2})/);
      if (timeMatch && totalDurationSec > 0) {
        const currentSec =
          parseInt(timeMatch[1]) * 3600 +
          parseInt(timeMatch[2]) * 60 +
          parseFloat(timeMatch[3]);
        const percent = Math.min(100, Math.round((currentSec / totalDurationSec) * 100));
        event.sender.send("proxy-progress", percent);
      }
    });
  });
});
`;

if (!main.includes("prepare-video-proxy")) {
  main = main.replace('// ==========================================\n// VIDEO EDITOR POPUP ROUTER', code + '\n// ==========================================\n// VIDEO EDITOR POPUP ROUTER');
  fs.writeFileSync('main.js', main);
  console.log("Added proxy handler to main.js");
}

let preload = fs.readFileSync('preload.js', 'utf8');
if (!preload.includes("prepareVideoProxy")) {
  preload = preload.replace(/onInitVideoEditor: \\(callback\\) =>\\n    ipcRenderer.on\\("init-video-editor", \\(event, payload\\) => callback\\(payload\\)\\),/, 
  'onInitVideoEditor: (callback) =>\n    ipcRenderer.on("init-video-editor", (event, payload) => callback(payload)),\n  prepareVideoProxy: (filePath) => ipcRenderer.invoke("prepare-video-proxy", filePath),\n  onProxyProgress: (callback) => ipcRenderer.on("proxy-progress", (event, p) => callback(p)),');
  fs.writeFileSync('preload.js', preload);
  console.log("Added proxy API to preload.js");
}
