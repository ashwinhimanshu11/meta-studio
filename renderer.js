import { initProgress } from './js/progress.js';
import { initUI } from './js/ui.js';
import { initConverter, loadConverterFolder } from './js/converter.js';
import { initMetadata, loadRootDirectory } from './js/metadata.js';

// Initialize all the isolated modules
initProgress();
initUI();
initConverter();
initMetadata();

// Global Drag and Drop Orchestrator
const dragOverlay = document.getElementById("drag-overlay");
const converterDropZone = document.getElementById("converter-drop-zone");

document.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (document.body.dataset.mode === "metadata") dragOverlay.classList.add("active");
    if (document.body.dataset.mode === "converter") converterDropZone.classList.add("active");
});

document.addEventListener("dragleave", (e) => {
    e.preventDefault();
    if (e.relatedTarget === null || e.target === dragOverlay) dragOverlay.classList.remove("active");
    if (e.relatedTarget === null || e.target === converterDropZone) converterDropZone.classList.remove("active");
});

document.addEventListener("drop", (e) => {
    e.preventDefault();
    dragOverlay.classList.remove("active");
    converterDropZone.classList.remove("active");
    
    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    // Grab the actual file path using Electron's webUtils
    const droppedPath = window.electronAPI.getFilePath(files[0]);
    
    // Route the path to the correct workspace module
    if (document.body.dataset.mode === "converter") {
        loadConverterFolder(droppedPath);
    } else if (document.body.dataset.mode === "metadata") {
        loadRootDirectory(droppedPath);
    }
});