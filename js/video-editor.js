import { escapeHtml, videoExtensions } from "./utils.js";

let currentSelectedVideoPath = null;
let currentSelectedVideoExtension = null;

export function initVideoEditor() {
  document
    .getElementById("video-folder-input")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter" && e.target.value.trim()) {
        loadVideoEditorFolder(e.target.value.trim());
      }
    });

  document.getElementById("video-edit-btn").addEventListener("click", () => {
    if (currentSelectedVideoPath) {
      window.electronAPI.openVideoEditorWindow({
        filePath: currentSelectedVideoPath,
        extension: currentSelectedVideoExtension,
        theme: document.documentElement.getAttribute("data-theme") || "light"
      });
    }
  });

  setupBulkMuteLogic();
}

let bulkMuteFilesList = [];

function setupBulkMuteLogic() {
  document.getElementById("bulk-mute-files-opt").addEventListener("click", async () => {
    const result = await window.electronAPI.selectFilesDialog();
    if (!result.canceled && result.filePaths.length > 0) {
      // Filter out non-videos just in case
      bulkMuteFilesList = result.filePaths.filter(p => {
        const ext = p.split('.').pop().toLowerCase();
        return videoExtensions.includes(ext);
      });
      showBulkMuteContainer();
    }
  });

  document.getElementById("bulk-mute-folder-opt").addEventListener("click", async () => {
    const result = await window.electronAPI.selectFolderDialog();
    if (!result.canceled && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0];
      const entries = await window.electronAPI.readDirectoryRecursive(folderPath);
      if (!entries.error) {
        bulkMuteFilesList = entries
          .filter(e => !e.isDirectory && videoExtensions.includes(e.extension))
          .map(e => e.path);
        showBulkMuteContainer();
      }
    }
  });

  document.getElementById("cancel-bulk-mute-btn").addEventListener("click", () => {
    bulkMuteFilesList = [];
    document.getElementById("video-bulk-mute-container").style.display = "none";
    document.getElementById("video-empty-state").style.display = "flex";
  });

  document.getElementById("perform-bulk-mute-btn").addEventListener("click", async () => {
    const checkboxes = document.querySelectorAll('.bulk-mute-cb:checked');
    const selectedFiles = Array.from(checkboxes).map(cb => cb.dataset.path);
    if (selectedFiles.length === 0) return;
    
    // Show progress modal
    const progressModal = document.getElementById("progress-modal");
    const progressTitle = document.getElementById("progress-title");
    const progressFill = document.getElementById("progress-fill");
    const progressPercent = document.getElementById("progress-percent");
    const progressCount = document.getElementById("progress-count");
    const progressDetail = document.getElementById("progress-detail");
    
    progressModal.classList.add("active");
    progressTitle.textContent = "Muting Videos";
    progressFill.style.width = "0%";
    progressPercent.textContent = "0%";
    progressCount.textContent = `0 / ${selectedFiles.length}`;
    progressDetail.textContent = "Starting...";

    const res = await window.electronAPI.bulkMuteVideos({ files: selectedFiles });
    
    progressModal.classList.remove("active");
    
    if (res.error) {
      alert("Error: " + res.error);
    } else {
      alert("Successfully muted " + res.results.filter(r => r.success).length + " videos.");
      // go back to empty state
      document.getElementById("cancel-bulk-mute-btn").click();
    }
  });
}

function showBulkMuteContainer() {
  document.getElementById("video-empty-state").style.display = "none";
  document.getElementById("video-preview-container").style.display = "none";
  document.getElementById("video-bulk-mute-container").style.display = "flex";
  
  document.getElementById("bulk-mute-count").textContent = `${bulkMuteFilesList.length} video(s) selected`;
  
  const listEl = document.getElementById("bulk-mute-list");
  listEl.innerHTML = "";
  
  if (bulkMuteFilesList.length === 0) {
    listEl.innerHTML = "<div style='color: var(--text-muted); padding: 10px;'>No valid video files found in the selection.</div>";
    document.getElementById("perform-bulk-mute-btn").disabled = true;
    return;
  }
  
  document.getElementById("perform-bulk-mute-btn").disabled = false;
  
  bulkMuteFilesList.forEach(path => {
    const item = document.createElement("label");
    item.style.padding = "8px";
    item.style.borderBottom = "1px solid var(--border-color)";
    item.style.fontSize = "13px";
    item.style.wordBreak = "break-all";
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.gap = "10px";
    item.style.cursor = "pointer";
    item.style.transition = "background 0.2s";
    
    item.addEventListener("mouseenter", () => item.style.background = "var(--bg-hover)");
    item.addEventListener("mouseleave", () => item.style.background = "transparent");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = true;
    cb.className = "bulk-mute-cb";
    cb.dataset.path = path;
    cb.style.cursor = "pointer";
    cb.style.width = "14px";
    cb.style.height = "14px";
    cb.style.accentColor = "var(--gts-teal)";
    cb.style.margin = "0";
    
    cb.addEventListener("change", () => {
       const selectedCount = document.querySelectorAll('.bulk-mute-cb:checked').length;
       document.getElementById("bulk-mute-count").textContent = `${selectedCount} video(s) selected`;
       document.getElementById("perform-bulk-mute-btn").disabled = selectedCount === 0;
    });

    const labelSpan = document.createElement("span");
    labelSpan.textContent = path;
    labelSpan.style.flex = "1";

    item.appendChild(cb);
    item.appendChild(labelSpan);
    listEl.appendChild(item);
  });
}

export async function loadVideoEditorFolder(path) {
  document.getElementById("video-folder-input").value = path;
  document.getElementById("video-empty-state").style.display = "flex";
  document.getElementById("video-bulk-mute-container").style.display = "none";
  document.getElementById("video-preview-container").style.display = "none";
  currentSelectedVideoPath = null;
  currentSelectedVideoExtension = null;

  const tree = document.getElementById("video-file-tree");
  await renderVideoEditorDirectory(path, tree);
}

async function renderVideoEditorDirectory(path, containerElement) {
  containerElement.innerHTML = '<div class="tree-item" style="color: #888; padding-left: 25px;">Loading...</div>';
  const entries = await window.electronAPI.readDirectory(path);
  if (entries.error) {
    containerElement.innerHTML = `<div class="tree-item" style="color: #f48771; padding-left: 10px;">Error: ${entries.error}</div>`;
    return;
  }
  containerElement.innerHTML = "";

  // Filter to show only directories and videos
  const filteredEntries = entries.filter(entry => {
    if (entry.isDirectory) return true;
    return videoExtensions.includes(entry.extension.toLowerCase());
  });

  filteredEntries.forEach((entry) => {
    const node = document.createElement("div");
    node.className = "tree-node";
    const item = document.createElement("div");
    item.className = `tree-item ${entry.isDirectory ? "folder" : "file"}`;

    const toggle = entry.isDirectory
      ? '<span class="material-symbols-rounded folder-toggle">chevron_right</span>'
      : '<span class="folder-toggle empty"></span>';
    
    let iconName = entry.isDirectory ? "folder" : "movie";

    const content = document.createElement("div");
    content.className = "item-content";
    content.style.display = "flex";
    content.style.alignItems = "center";
    content.style.flex = "1";
    content.style.minWidth = "0";
    content.innerHTML = `${toggle}<span class="material-symbols-rounded icon">${iconName}</span><span class="name" title="${escapeHtml(entry.name)}">${escapeHtml(entry.name)}</span>`;
    
    item.appendChild(content);
    node.appendChild(item);

    if (entry.isDirectory) {
      const childrenContainer = document.createElement("div");
      childrenContainer.className = "children-container";
      node.appendChild(childrenContainer);
      let isLoaded = false;
      
      content.addEventListener("mousedown", async (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        if (!item.classList.contains("open")) {
          item.classList.add("open");
          childrenContainer.classList.add("open");
          if (!isLoaded) {
            await renderVideoEditorDirectory(entry.path, childrenContainer);
            isLoaded = true;
          }
        } else {
          item.classList.remove("open");
          childrenContainer.classList.remove("open");
        }
      });
    } else {
      content.addEventListener("mousedown", async (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        
        document
          .querySelectorAll("#video-file-tree .tree-item.selected")
          .forEach((el) => el.classList.remove("selected"));
        item.classList.add("selected");

        // Handle Video Selection
        currentSelectedVideoPath = entry.path;
        currentSelectedVideoExtension = entry.extension;
        
        document.getElementById("video-empty-state").style.display = "none";
        document.getElementById("video-bulk-mute-container").style.display = "none";
        const previewContainer = document.getElementById("video-preview-container");
        previewContainer.style.display = "flex";
        
        const previewVid = document.getElementById("video-preview-vid");
        
        // Videos can be loaded via a file:// URL in some isolated contexts if allowed, 
        // or through a custom protocol, but for now we'll set the src to the local path.
        // It might not play perfectly if it's not mp4/webm, but it fulfills the layout requirement.
        previewVid.src = 'file://' + entry.path;
      });
    }
    containerElement.appendChild(node);
  });
}
