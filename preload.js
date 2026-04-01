const { contextBridge, webUtils, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // We pass the dropped file here, and webUtils extracts its real path
    getFilePath: (file) => webUtils.getPathForFile(file),
    readDirectory: (path) => ipcRenderer.invoke('read-dir', path)
});