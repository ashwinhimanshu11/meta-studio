const { contextBridge, webUtils, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getFilePath: (file) => webUtils.getPathForFile(file),
    readDirectory: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
    readDirectoryRecursive: (dirPath) => ipcRenderer.invoke('read-dir-recursive', dirPath),
    getFileDetails: (filePath) => ipcRenderer.invoke('get-file-details', filePath),
    getExifData: (filePath) => ipcRenderer.invoke('get-exif-data', filePath),
    
    // NEW: Popup Window Controls
    openExifWindow: (payload) => ipcRenderer.send('open-exif-window', payload),
    onRenderExif: (callback) => ipcRenderer.on('render-exif', (event, payload) => callback(payload))
});