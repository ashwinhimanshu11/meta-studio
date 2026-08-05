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
}

export async function loadVideoEditorFolder(path) {
  document.getElementById("video-folder-input").value = path;
  document.getElementById("video-empty-state").style.display = "flex";
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
