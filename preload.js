const { contextBridge, webUtils, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getFilePath: (file) => webUtils.getPathForFile(file),
    readDirectory: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
    readDirectoryRecursive: (dirPath) => ipcRenderer.invoke('read-dir-recursive', dirPath),
    getFileDetails: (filePath) => ipcRenderer.invoke('get-file-details', filePath),
    
    // NEW: Expose the ExifTool function
    getExifData: (filePath) => ipcRenderer.invoke('get-exif-data', filePath)
});