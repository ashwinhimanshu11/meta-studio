import { escapeHtml, imageExtensions } from "./utils.js";

let currentSelectedImagePath = null;
let currentSelectedImageExtension = null;

export function initEditor() {
  document
    .getElementById("editor-folder-input")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter" && e.target.value.trim()) {
        loadEditorFolder(e.target.value.trim());
      }
    });

  document.getElementById("editor-edit-btn").addEventListener("click", () => {
    if (currentSelectedImagePath) {
      window.electronAPI.openImageEditorWindow({
        filePath: currentSelectedImagePath,
        extension: currentSelectedImageExtension,
        theme: document.documentElement.getAttribute("data-theme") || "light"
      });
    }
  });
}

export async function loadEditorFolder(path) {
  document.getElementById("editor-folder-input").value = path;
  document.getElementById("editor-empty-state").style.display = "flex";
  document.getElementById("editor-preview-container").style.display = "none";
  currentSelectedImagePath = null;
  currentSelectedImageExtension = null;

  const tree = document.getElementById("editor-file-tree");
  await renderEditorDirectory(path, tree);
}

async function renderEditorDirectory(path, containerElement) {
  containerElement.innerHTML = '<div class="tree-item" style="color: #888; padding-left: 25px;">Loading...</div>';
  const entries = await window.electronAPI.readDirectory(path);
  if (entries.error) {
    containerElement.innerHTML = `<div class="tree-item" style="color: #f48771; padding-left: 10px;">Error: ${entries.error}</div>`;
    return;
  }
  containerElement.innerHTML = "";

  // Filter to show only directories and images
  const filteredEntries = entries.filter(entry => {
    if (entry.isDirectory) return true;
    return imageExtensions.includes(entry.extension.toLowerCase());
  });

  filteredEntries.forEach((entry) => {
    const node = document.createElement("div");
    node.className = "tree-node";
    const item = document.createElement("div");
    item.className = `tree-item ${entry.isDirectory ? "folder" : "file"}`;

    const toggle = entry.isDirectory
      ? '<span class="material-symbols-rounded folder-toggle">chevron_right</span>'
      : '<span class="folder-toggle empty"></span>';
    
    let iconName = entry.isDirectory ? "folder" : "image";

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
            await renderEditorDirectory(entry.path, childrenContainer);
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
          .querySelectorAll("#editor-file-tree .tree-item.selected")
          .forEach((el) => el.classList.remove("selected"));
        item.classList.add("selected");

        // Handle Image Selection
        currentSelectedImagePath = entry.path;
        currentSelectedImageExtension = entry.extension;
        
        document.getElementById("editor-empty-state").style.display = "none";
        const previewContainer = document.getElementById("editor-preview-container");
        previewContainer.style.display = "flex";
        
        const previewImg = document.getElementById("editor-preview-img");
        
        // Use getFileDetails to get the base64 thumbnail if small, or direct load via custom protocol if needed
        // Since we are not doing a full photo editor yet, and standard img tag can't directly load absolute paths in isolated context without a protocol,
        // we'll fetch details which returns thumbnail for smaller files, or we can just try to use a local path if webPreferences allow it.
        document.body.style.cursor = "wait";
        const details = await window.electronAPI.getFileDetails(entry.path);
        document.body.style.cursor = "default";
        
        if (details.thumbnail) {
          previewImg.src = details.thumbnail;
        } else {
          // Fallback, we might not have a thumbnail for large files or we should generate one
          previewImg.src = "";
          previewImg.alt = "Preview not available for this large file.";
        }
      });
    }
    containerElement.appendChild(node);
  });
}
