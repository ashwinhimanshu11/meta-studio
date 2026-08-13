const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');
const { app } = require('electron');

function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const request = (currentUrl) => {
      https.get(currentUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return request(response.headers.location);
        }
        if (response.statusCode !== 200) {
          return reject(new Error(`Download failed for '${currentUrl}' (Status: ${response.statusCode}). Please check your internet connection or try again later.`));
        }
        const total = parseInt(response.headers['content-length'] || '0', 10);
        let downloaded = 0;
        const file = fs.createWriteStream(dest);
        
        response.on('data', (chunk) => {
          downloaded += chunk.length;
          if (onProgress && total) {
            onProgress(downloaded / total);
          }
        });
        
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
    };
    request(url);
  });
}

function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Command failed: ${command}\n${stderr}`);
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

function getLatestExifToolUrl() {
  return new Promise((resolve, reject) => {
    https.get('https://exiftool.org/', (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        const match64 = data.match(/href="([^"]*exiftool-[0-9.]+_64\.zip)"/);
        if (match64) {
          return resolve(`https://exiftool.org/${match64[1]}`);
        }
        const match32 = data.match(/href="([^"]*exiftool-[0-9.]+\.zip)"/);
        if (match32) {
          return resolve(`https://exiftool.org/${match32[1]}`);
        }
        reject(new Error("Could not automatically find the latest ExifTool Windows zip link on exiftool.org."));
      });
    }).on('error', (err) => reject(new Error(`Failed to reach exiftool.org: ${err.message}`)));
  });
}

async function performWindowsSetup(event) {
  const userData = app.getPath('userData');
  const binDir = path.join(userData, 'bin');
  const yoloDir = path.join(userData, 'yolo');
  const pythonDir = path.join(yoloDir, 'python');
  
  if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });
  if (!fs.existsSync(yoloDir)) fs.mkdirSync(yoloDir, { recursive: true });
  if (!fs.existsSync(pythonDir)) fs.mkdirSync(pythonDir, { recursive: true });

  const reportProgress = (task, percent) => {
    if (event) event.sender.send('setup-progress', { task, percent });
  };

  try {
    // 1. Download FFmpeg
    reportProgress('Downloading FFmpeg...', 0);
    const ffmpegZip = path.join(userData, 'ffmpeg.zip');
    await downloadFile('https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip', ffmpegZip, (p) => reportProgress('Downloading FFmpeg...', p));
    reportProgress('Extracting FFmpeg...', 1);
    await runCommand(`powershell -command "Expand-Archive -Force '${ffmpegZip}' '${userData}'"`, userData);
    const extractedFfmpegDir = path.join(userData, 'ffmpeg-master-latest-win64-gpl', 'bin');
    fs.copyFileSync(path.join(extractedFfmpegDir, 'ffmpeg.exe'), path.join(binDir, 'ffmpeg.exe'));
    fs.copyFileSync(path.join(extractedFfmpegDir, 'ffprobe.exe'), path.join(binDir, 'ffprobe.exe'));
    fs.unlinkSync(ffmpegZip);
    fs.rmSync(path.join(userData, 'ffmpeg-master-latest-win64-gpl'), { recursive: true, force: true });

    // 2. Setup ExifTool (Bundled)
    reportProgress('Setting up ExifTool...', 0.5);
    const bundledExifTool = app.isPackaged 
      ? path.join(process.resourcesPath, 'bin', 'win', 'exiftool.exe') 
      : path.join(__dirname, 'bin', 'win', 'exiftool.exe');
    if (fs.existsSync(bundledExifTool)) {
        fs.copyFileSync(bundledExifTool, path.join(binDir, 'exiftool.exe'));
    } else {
        throw new Error("Bundled ExifTool executable not found in resources.");
    }

    // 3. Download YOLO Model
    reportProgress('Downloading YOLOv8 Model...', 0);
    await downloadFile('https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt', path.join(yoloDir, 'yolov8n.pt'), (p) => reportProgress('Downloading YOLOv8 Model...', p));

    // 4. Download Python Embeddable
    reportProgress('Downloading Python Engine...', 0);
    const pythonZip = path.join(userData, 'python.zip');
    await downloadFile('https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip', pythonZip, (p) => reportProgress('Downloading Python Engine...', p));
    reportProgress('Extracting Python...', 1);
    await runCommand(`powershell -command "Expand-Archive -Force '${pythonZip}' '${pythonDir}'"`, userData);
    fs.unlinkSync(pythonZip);

    // Modify python311._pth to uncomment import site
    const pthFile = path.join(pythonDir, 'python311._pth');
    let pthContent = fs.readFileSync(pthFile, 'utf8');
    pthContent = pthContent.replace('#import site', 'import site');
    fs.writeFileSync(pthFile, pthContent);

    // Download get-pip.py
    reportProgress('Setting up Python Environment...', 0.2);
    await downloadFile('https://bootstrap.pypa.io/get-pip.py', path.join(pythonDir, 'get-pip.py'));
    
    // Install pip
    reportProgress('Installing PIP...', 0.4);
    await runCommand(`.\\python.exe get-pip.py`, pythonDir);

    // Install ultralytics and opencv
    reportProgress('Installing AI Dependencies (This may take a few minutes)...', 0.6);
    await runCommand(`.\\python.exe -m pip install ultralytics opencv-python`, pythonDir);
    
    // Install python script for inference
    reportProgress('Finalizing...', 0.9);
    const scriptSource = app.isPackaged ? path.join(process.resourcesPath, 'yolo_redact.py') : path.join(__dirname, 'yolo_redact.py');
    if (fs.existsSync(scriptSource)) {
        fs.copyFileSync(scriptSource, path.join(yoloDir, 'yolo_redact.py'));
    }

    reportProgress('Setup Complete!', 1);
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: err.message };
  }
}

module.exports = { performWindowsSetup };
