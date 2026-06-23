const { contextBridge, webUtils, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getFilePath: (file) => webUtils.getPathForFile(file),
    readDirectory: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
    readDirectoryRecursive: (dirPath) => ipcRenderer.invoke('read-dir-recursive', dirPath),
    getFileDetails: (filePath) => ipcRenderer.invoke('get-file-details', filePath),
    getExifData: (filePath) => ipcRenderer.invoke('get-exif-data', filePath),
    copyText: (text) => ipcRenderer.invoke('copy-text', text),
    readText: () => ipcRenderer.invoke('read-text'),
    pasteExifMetadata: (sourcePath, targetPath) => ipcRenderer.invoke('paste-exif-metadata', sourcePath, targetPath),
    applyExifEdits: (payload) => ipcRenderer.invoke('apply-exif-edits', payload),
    randomizeExifDate: (payload) => ipcRenderer.invoke('randomize-exif-date', payload),
    convertMediaFiles: (payload) => ipcRenderer.invoke('convert-media-files', payload),
    
    // NEW: Progress & Cancel Trackers
    onTaskProgress: (callback) => ipcRenderer.on('task-progress', (event, payload) => callback(payload)),
    cancelTask: () => ipcRenderer.send('cancel-task'),
    
    // Popup Window Controls
    openExifWindow: (payload) => ipcRenderer.send('open-exif-window', payload),
    onRenderExif: (callback) => ipcRenderer.on('render-exif', (event, payload) => callback(payload)),
    onMetadataUpdated: (callback) => ipcRenderer.on('metadata-updated', (event, paths) => callback(paths))
});