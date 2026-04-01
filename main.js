const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

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

// Listen for 'read-dir' requests from the UI
ipcMain.handle('read-dir', async (event, dirPath) => {
    try {
        // NEW: Check if the dropped path is a file or a folder
        const stat = fs.statSync(dirPath);
        let targetDir = dirPath;

        // If it's a file, let's be smart and load its parent folder instead
        if (!stat.isDirectory()) {
            targetDir = path.dirname(dirPath);
        }

        // Read the directory contents
        const entries = fs.readdirSync(targetDir, { withFileTypes: true });
        
        // Map and sort the results (Folders first, then files)
        return entries.map(entry => ({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            path: path.join(targetDir, entry.name)
        })).sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
    } catch (error) {
        console.error("Error reading directory:", error);
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