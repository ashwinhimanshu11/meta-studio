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
      
      document.getElementById('video-edit-btn').style.display = 'none';
      document.getElementById('video-right-resizer').style.display = 'block';
      document.getElementById('video-options-panel').style.display = 'flex';
      window.startVideoEditor({ filePath: currentSelectedVideoPath });

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

let isEdited = false;

// --- Injected Video Editor Logic ---

      
      let isCroppingMode = false;
      let isBlurringMode = false;
      let isMuted = false;
      let cropper = null;
      let cropData = null; // { x, y, width, height }
      let blurData = null; // { x, y, w, h, start, end }
      
      const video = document.getElementById('video-preview-vid');
      const trimStart = document.getElementById("trim-start");
      const trimEnd = document.getElementById("trim-end");
      
      function showToast(message) {
        const toast = document.getElementById("status-toast");
        toast.textContent = message;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
      }
      
      function enableSave() {
        isEdited = true;
        document.getElementById("btn-save-vid").disabled = false;
        document.getElementById("btn-cancel-vid").disabled = false;
      }
      
      function disableSave() {
        isEdited = false;
        document.getElementById("btn-save-vid").disabled = true;
        document.getElementById("btn-cancel-vid").disabled = true;
        document.getElementById("save-dropdown-vid").classList.remove("show");
        cropData = null;
        blurData = null;
        isMuted = false;
        updateMuteUI();
        trimStart.value = "";
        trimEnd.value = "";
        video.style.objectViewBox = "none";
        exitCropMode();
        exitBlurMode();
      }
      
      document.getElementById("btn-set-start").addEventListener("click", () => {
        trimStart.value = video.currentTime.toFixed(2);
        enableSave();
      });
      document.getElementById("btn-set-end").addEventListener("click", () => {
        trimEnd.value = video.currentTime.toFixed(2);
        enableSave();
      });
      
      trimStart.addEventListener("input", enableSave);
      trimEnd.addEventListener("input", enableSave);
      
      document.getElementById("btn-cancel-vid").addEventListener("click", disableSave);
      
      function updateMuteUI() {
        document.getElementById("mute-icon").textContent = isMuted ? "volume_off" : "volume_up";
        document.getElementById("mute-text").textContent = isMuted ? "Unmute" : "Mute";
        if (isMuted) {
          document.getElementById("btn-mute-mode").classList.add("primary");
        } else {
          document.getElementById("btn-mute-mode").classList.remove("primary");
        }
      }

      document.getElementById("btn-mute-mode").addEventListener("click", () => {
        isMuted = !isMuted;
        updateMuteUI();
        enableSave();
      });

      function exitCropMode() {
        isCroppingMode = false;
        document.getElementById("crop-text").textContent = "Crop";
        document.getElementById("crop-icon").textContent = "crop";
        document.getElementById("btn-crop-mode").classList.remove("primary");
        document.getElementById("crop-overlay-container").style.display = "none";
        if (cropper) {
          cropper.destroy();
          cropper = null;
        }
        video.style.display = "block";
      }
      
      document.getElementById("btn-crop-mode").addEventListener("click", () => {
        if (isCroppingMode) {
          // Apply Crop
          if (cropper) {
            const data = cropper.getData();
            if (data.width > 0 && data.height > 0) {
              cropData = { x: Math.round(data.x), y: Math.round(data.y), w: Math.round(data.width), h: Math.round(data.height) };
              enableSave();
              
              const top = cropData.y;
              const left = cropData.x;
              const right = video.videoWidth - (cropData.x + cropData.w);
              const bottom = video.videoHeight - (cropData.y + cropData.h);
              video.style.objectViewBox = `inset(${top}px ${right}px ${bottom}px ${left}px)`;
            }
          }
          exitCropMode();
        } else {
          // Enter Crop
          if (!video.videoWidth) {
            alert("Video is not fully loaded yet. Please play the video first.");
            return;
          }
          isCroppingMode = true;
          document.getElementById("crop-text").textContent = "Apply Crop";
          document.getElementById("crop-icon").textContent = "check";
          document.getElementById("btn-crop-mode").classList.add("primary");
          
          video.pause();
          
          try {
            const tempBox = video.style.objectViewBox;
            video.style.objectViewBox = "none";
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            video.style.objectViewBox = tempBox;
            
            const cropImg = document.getElementById("crop-image");
            
            // Assign onload before setting src for dataURIs
            cropImg.onload = () => {
              if (cropper) cropper.destroy();
              cropper = new Cropper(cropImg, {
                viewMode: 1,
                dragMode: 'crop',
                autoCrop: false,
                restore: false,
                zoomable: false,
                guides: true
              });
              if (cropData) {
                cropper.setData({ x: cropData.x, y: cropData.y, width: cropData.w, height: cropData.h });
              }
            };
            
            cropImg.src = canvas.toDataURL("image/jpeg");
            
            video.style.display = "none";
            document.getElementById("crop-overlay-container").style.display = "flex";
          } catch (err) {
            alert("Failed to grab video frame for cropping: " + err.message);
            exitCropMode();
          }
        }
      });
      
      function exitBlurMode() {
        isBlurringMode = false;
        document.getElementById("blur-dropdown-wrapper").style.display = "none";
        document.getElementById("btn-blur-mode").style.display = "flex";
        document.getElementById("crop-overlay-container").style.display = "none";
        if (cropper) {
          cropper.destroy();
          cropper = null;
        }
        video.style.display = "block";
      }

      document.getElementById("btn-blur-mode").addEventListener("click", () => {
        if (!video.videoWidth) {
          alert("Video is not fully loaded yet. Please play the video first.");
          return;
        }
        exitCropMode(); // Exit crop mode if active
        isBlurringMode = true;
        document.getElementById("btn-blur-mode").style.display = "none";
        document.getElementById("blur-dropdown-wrapper").style.display = "inline-flex";
        
        video.pause();
        try {
          const tempBox = video.style.objectViewBox;
          video.style.objectViewBox = "none";
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          video.style.objectViewBox = tempBox;
          
          const cropImg = document.getElementById("crop-image");
          cropImg.onload = () => {
            if (cropper) cropper.destroy();
            cropper = new Cropper(cropImg, {
              viewMode: 1,
              dragMode: 'crop',
              autoCrop: false,
              restore: false,
              zoomable: false,
              guides: true
            });
            if (blurData) {
              cropper.setData({ x: blurData.x, y: blurData.y, width: blurData.w, height: blurData.h });
            }
          };
          cropImg.src = canvas.toDataURL("image/jpeg");
          video.style.display = "none";
          document.getElementById("crop-overlay-container").style.display = "flex";
        } catch (err) {
          alert("Failed to grab video frame for blurring: " + err.message);
          exitBlurMode();
        }
      });

      document.getElementById("btn-apply-blur").addEventListener("click", (e) => {
        e.stopPropagation();
        document.getElementById("apply-blur-dropdown").classList.toggle("show");
      });

      function applyBlurSettings(start, end) {
        if (cropper) {
          const data = cropper.getData();
          if (data.width > 0 && data.height > 0) {
            blurData = { x: Math.round(data.x), y: Math.round(data.y), w: Math.round(data.width), h: Math.round(data.height), start, end };
            enableSave();
          }
        }
        exitBlurMode();
      }

      document.getElementById("btn-blur-entire").addEventListener("click", () => {
        applyBlurSettings(null, null);
      });

      document.getElementById("btn-blur-timeframe").addEventListener("click", () => {
        document.getElementById("apply-blur-dropdown").classList.remove("show");
        document.getElementById("blur-start").value = trimStart.value || "0";
        document.getElementById("blur-end").value = trimEnd.value || video.duration.toFixed(2);
        document.getElementById("blur-time-modal").style.display = "flex";
      });

      document.getElementById("btn-cancel-blur-time").addEventListener("click", () => {
        document.getElementById("blur-time-modal").style.display = "none";
      });

      document.getElementById("btn-confirm-blur-time").addEventListener("click", () => {
        const st = parseFloat(document.getElementById("blur-start").value);
        const en = parseFloat(document.getElementById("blur-end").value);
        if (isNaN(st) || isNaN(en) || st >= en) {
          alert("Invalid timeframe.");
          return;
        }
        document.getElementById("blur-time-modal").style.display = "none";
        applyBlurSettings(st, en);
      });
      
      document.getElementById("btn-save-vid").addEventListener("click", (e) => {
        if (!isEdited) return;
        e.stopPropagation();
        document.getElementById("save-dropdown-vid").classList.toggle("show");
      });
      document.addEventListener("click", () => {
        document.getElementById("save-dropdown-vid").classList.remove("show");
      });
      
      async function triggerSave(replace) {
        document.getElementById("save-dropdown-vid").classList.remove("show");
        const ts = parseFloat(trimStart.value);
        const te = parseFloat(trimEnd.value);
        
        const payload = {
          filePath: currentFilePath,
          replace,
          trimStart: isNaN(ts) ? null : ts,
          trimEnd: isNaN(te) ? null : te,
          cropX: cropData ? cropData.x : null,
          cropY: cropData ? cropData.y : null,
          cropW: cropData ? cropData.w : null,
          cropH: cropData ? cropData.h : null,
          mute: isMuted,
          blurData: blurData
        };
        
        const toast = document.getElementById("status-toast");
        toast.textContent = "Saving video...";
        toast.classList.add("show");
        
        const res = await window.electronAPI.saveVideo(payload);
        
        if (res.error) {
          toast.textContent = "Error: " + res.error;
          setTimeout(() => toast.classList.remove("show"), 3000);
        } else {
          currentFilePath = res.newPath;
          disableSave();
          showToast("Video saved successfully!");
        }
      }
      
      document.getElementById("btn-save-replace-vid").addEventListener("click", () => triggerSave(true));
      document.getElementById("btn-save-new-vid").addEventListener("click", () => triggerSave(false));
      
      window.startVideoEditor = async function(payload) {
        if (payload.theme === "dark") {
          document.documentElement.setAttribute("data-theme", "dark");
        }
        
        currentFilePath = payload.filePath;
        document.getElementById('video-filename-display').textContent = payload.filePath.split(/[/\\]/).pop();
        
        const overlay = document.createElement("div");
        overlay.id = "proxy-overlay";
        overlay.style = "display: flex; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--bg-base); z-index: 100; flex-direction: column; align-items: center; justify-content: center; color: var(--text-main);";
        overlay.innerHTML = `
          <div style="font-size: 16px; margin-bottom: 12px; font-weight: 500;">Generating Playable Preview...</div>
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 24px;">Format not natively supported. Transcoding...</div>
          <div style="width: 300px; height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden;">
            <div id="proxy-progress-bar" style="width: 0%; height: 100%; background: var(--text-main); transition: width 0.2s;"></div>
          </div>
          <div id="proxy-text" style="font-size: 12px; margin-top: 8px; color: var(--text-muted);">0%</div>
        `;
        document.getElementById('video-preview-container').appendChild(overlay);
        overlay.style.display = "none";
        
        let proxyStarted = false;
        
        window.electronAPI.onProxyProgress((percent) => {
          if (!proxyStarted) {
            proxyStarted = true;
            overlay.style.display = "flex";
          }
          document.getElementById("proxy-progress-bar").style.width = percent + "%";
          document.getElementById("proxy-text").textContent = percent + "%";
        });
        
        const res = await window.electronAPI.prepareVideoProxy(payload.filePath);
        if (overlay) overlay.remove();
        
        if (res.error) {
          alert(res.error);
        } else {
          video.src = 'file://' + res.proxyPath;
        }
      };
    

document.getElementById('video-back-normal-btn').addEventListener('click', () => {
    document.getElementById('video-right-resizer').style.display = 'none';
    document.getElementById('video-options-panel').style.display = 'none';
    document.getElementById('video-edit-btn').style.display = 'flex';
    
    // reset UI
    const btnCancel = document.getElementById("btn-cancel-vid");
    if(btnCancel) btnCancel.click();
});

