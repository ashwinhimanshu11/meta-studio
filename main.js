const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { execFile } = require('child_process');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

function setBinaryPermissions() {
    // Windows doesn't use UNIX-style chmod permissions, so we skip it
    if (process.platform === 'win32') {
        console.log("Running on Windows: Skipping chmod.");
        return;
    }

    // Figure out if we should look in the 'mac' or 'linux' folder
    const osFolder = process.platform === 'darwin' ? 'mac' : 'linux';

    // The list of binaries from your screenshot
    const binaries = ['exiftool', 'ffmpeg', 'ffprobe'];

    binaries.forEach(binary => {
        // Build the absolute path to the binary
        const binaryPath = path.join(__dirname, 'bin', osFolder, binary);

        // Check if the file actually exists before trying to modify it
        if (fs.existsSync(binaryPath)) {
            try {
                // 0o755 translates to: Owner can read/write/execute. Others can read/execute.
                fs.chmodSync(binaryPath, 0o755);
                console.log(`[System] Executable permission set for: ${binary}`);
            } catch (err) {
                console.error(`[Error] Could not set permissions for ${binary}:`, err);
            }
        } else {
            console.warn(`[Warning] Binary not found at: ${binaryPath}`);
        }
    });
}

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            // We will add nodeIntegration later if needed, 
            // but keeping it off by default is best for security.
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Load the index.html of the app.
    mainWindow.loadFile('index.html');

    mainWindow.webContents.on('will-navigate', (event) => {
        event.preventDefault();
    });

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

// 1. Standard Folder Reader (Updated with Metadata)
ipcMain.handle('read-dir', async (event, dirPath) => {
    try {
        const stat = fs.statSync(dirPath);
        let targetDir = stat.isDirectory() ? dirPath : path.dirname(dirPath);
        const entries = fs.readdirSync(targetDir, { withFileTypes: true });
        
        return entries.map(entry => {
            const fullPath = path.join(targetDir, entry.name);
            let size = 0, modified = new Date();
            
            try { // Safety net for locked/hidden system files
                const fileStats = fs.statSync(fullPath);
                size = fileStats.size;
                modified = fileStats.mtime;
            } catch (err) { console.warn("Skipped metadata for locked file:", entry.name); }
            
            return {
                name: entry.name,
                isDirectory: entry.isDirectory(),
                path: fullPath,
                size: size,
                modified: modified,
                extension: entry.name.split('.').pop().toLowerCase()
            };
        }).sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
    } catch (error) { return { error: error.message }; }
});

// 2. Deep Recursive Crawler (For the Checkboxes)
ipcMain.handle('read-dir-recursive', async (event, dirPath) => {
    try {
        const results = [];
        function walk(currentPath) {
            const entries = fs.readdirSync(currentPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);
                if (entry.isDirectory()) {
                    walk(fullPath);
                } else {
                    try {
                        const fileStats = fs.statSync(fullPath);
                        results.push({
                            name: entry.name,
                            isDirectory: false,
                            path: fullPath,
                            size: fileStats.size,
                            modified: fileStats.mtime,
                            extension: entry.name.split('.').pop().toLowerCase()
                        });
                    } catch (err) {}
                }
            }
        }
        walk(dirPath);
        return results;
    } catch (error) { return { error: error.message }; }
});

// 3. Single File Deep Details & Thumbnail
ipcMain.handle('get-file-details', async (event, filePath) => {
    try {
        const stats = fs.statSync(filePath);
        const ext = filePath.split('.').pop().toLowerCase();
        let thumbnail = null;

        // If it's an image (and under 10MB to prevent memory crashes), generate a base64 thumbnail
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (imageExtensions.includes(ext) && stats.size < 10 * 1024 * 1024) {
            try {
                const buffer = fs.readFileSync(filePath);
                const mimeType = ext === 'jpg' ? 'jpeg' : ext;
                thumbnail = `data:image/${mimeType};base64,${buffer.toString('base64')}`;
            } catch (err) {
                console.warn("Could not generate thumbnail for:", filePath);
            }
        }

        return {
            name: path.basename(filePath),
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            extension: ext,
            thumbnail: thumbnail
        };
    } catch (error) {
        return { error: error.message };
    }
});

// This method is called when Electron has finished initialization
app.whenReady().then(() => {
    setBinaryPermissions();
    createWindow();
});

// Quit when all windows are closed, EXCEPT on macOS.
// On macOS, it is common for applications and their menu bar 
// to stay active until the user quits explicitly with Cmd + Q.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// On macOS, recreate a window when the dock icon is clicked and no other windows are open.
app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

// 4. ExifTool Integration (Cross-Platform)
ipcMain.handle('get-exif-data', async (event, filePath) => {
    return new Promise((resolve) => {
        // 1. Detect Operating System
        let platformFolder = 'linux';
        let executableName = 'exiftool';
        
        if (process.platform === 'win32') {
            platformFolder = 'win';
            executableName = 'exiftool.exe';
        } else if (process.platform === 'darwin') {
            platformFolder = 'mac';
        }

        // 2. Construct the exact path to the binary
        const exiftoolPath = path.join(__dirname, 'bin', platformFolder, executableName);

        // 3. Execute the binary safely (execFile prevents shell injection from weird file names)
        execFile(exiftoolPath, ['-j', filePath], (error, stdout, stderr) => {
            if (error) {
                console.error("Exiftool error:", error);
                resolve({ error: error.message });
                return;
            }
            try {
                // Exiftool -j returns an array containing one JSON object
                const data = JSON.parse(stdout);
                resolve(data[0]); 
            } catch (e) {
                resolve({ error: "Failed to parse EXIF data." });
            }
        });
    });
});