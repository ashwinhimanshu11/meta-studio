const { contextBridge, webUtils, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getFilePath: (file) => webUtils.getPathForFile(file),
    readDirectory: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
    readDirectoryRecursive: (dirPath) => ipcRenderer.invoke('read-dir-recursive', dirPath),
    
    // NEW: Fetch deep details for the right sidebar
    getFileDetails: (filePath) => ipcRenderer.invoke('get-file-details', filePath)
});