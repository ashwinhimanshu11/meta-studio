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
      
      document.getElementById('editor-edit-btn').style.display = 'none';
      document.getElementById('editor-right-resizer').style.display = 'block';
      document.getElementById('editor-options-panel').style.display = 'flex';
      window.startImageEditor({ filePath: currentSelectedImagePath });

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
    
    if (!entry.isDirectory) {
      const printBtn = document.createElement("span");
      printBtn.className = "material-symbols-rounded icon-action";
      printBtn.textContent = "print";
      printBtn.style.marginLeft = "auto";
      printBtn.style.padding = "4px";
      printBtn.style.fontSize = "16px";
      printBtn.style.cursor = "pointer";
      printBtn.style.display = "none";
      printBtn.title = "Print Image";
      printBtn.style.color = "var(--text-muted)";
      
      printBtn.addEventListener("mouseenter", () => printBtn.style.color = "var(--text-main)");
      printBtn.addEventListener("mouseleave", () => printBtn.style.color = "var(--text-muted)");
      
      printBtn.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        printImage(entry.path);
      });
      
      content.appendChild(printBtn);
      
      item.addEventListener("mouseenter", () => printBtn.style.display = "block");
      item.addEventListener("mouseleave", () => printBtn.style.display = "none");
    }
    
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

function printImage(imagePath) {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <html>
      <head>
        <style>
          @page { margin: 0; size: auto; }
          body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: white; }
          img { max-width: 100%; max-height: 100%; object-fit: contain; }
        </style>
      </head>
      <body>
        <img src="file://${imagePath}" onload="window.print();" />
      </body>
    </html>
  `);
  doc.close();
  
  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }, 10000);
}

let isEdited = false;
let currentFilePath = null;

// --- Injected Image Editor Logic ---

      let originalSrc = null;
      let cropper = null;
      
      let isCroppingMode = false;
      let a4Mode = null;
      let baseRotation = 0;
      let straightenAngle = 0;

      function applyRotation() {
        if (!cropper) return;
        const totalAngle = baseRotation + straightenAngle;
        cropper.rotateTo(totalAngle);
        
        // Calculate the maximum inscribed rectangle to auto-crop transparent corners
        const imageData = cropper.getImageData();
        const isRotated90 = Math.abs(baseRotation) % 180 === 90;
        const w = isRotated90 ? imageData.naturalHeight : imageData.naturalWidth;
        const h = isRotated90 ? imageData.naturalWidth : imageData.naturalHeight;
        
        const rad = Math.abs(straightenAngle * Math.PI / 180);
        const sin = Math.sin(rad);
        const cos = Math.cos(rad);
        
        let currentAspectRatio = w / h;
        if (isCroppingMode && a4Mode === "portrait") {
          currentAspectRatio = 0.7071;
        } else if (isCroppingMode && a4Mode === "landscape") {
          currentAspectRatio = 1.4142;
        }
        
        // Calculate max inscribed crop dimensions
        const cropWLimit1 = w / (cos + sin / currentAspectRatio);
        const cropWLimit2 = h / (sin + cos / currentAspectRatio);
        const maxCropW = Math.min(cropWLimit1, cropWLimit2);
        const maxCropH = maxCropW / currentAspectRatio;
        
        if (!cropper.cropped) {
          cropper.crop();
        }
        
        cropper.setAspectRatio(currentAspectRatio);
        
        const canvasData = cropper.getCanvasData();
        const boundingW = w * cos + h * sin;
        const boundingH = w * sin + h * cos;
        
        // The scale of the canvas on screen vs natural
        const canvasScale = canvasData.width / boundingW;
        
        const cropWOnScreen = maxCropW * canvasScale;
        const cropHOnScreen = maxCropH * canvasScale;
        
        cropper.setCropBoxData({
          left: canvasData.left + (canvasData.width - cropWOnScreen) / 2,
          top: canvasData.top + (canvasData.height - cropHOnScreen) / 2,
          width: cropWOnScreen,
          height: cropHOnScreen
        });
        
        enableSave();
      }

      function showToast(message) {
        const toast = document.getElementById("status-toast");
        toast.textContent = message;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
      }

      function enableSave() {
        isEdited = true;
        document.getElementById("btn-save").disabled = false;
        document.getElementById("btn-cancel").disabled = false;
      }
      
      function disableSave() {
        isEdited = false;
        document.getElementById("btn-save").disabled = true;
        document.getElementById("btn-cancel").disabled = true;
        document.getElementById("save-dropdown").classList.remove("show");
      }
      
      document.getElementById("btn-save").addEventListener("click", (e) => {
        if (!isEdited) return;
        e.stopPropagation();
        document.getElementById("save-dropdown").classList.toggle("show");
      });
      
      document.addEventListener("click", () => {
        document.getElementById("save-dropdown").classList.remove("show");
      });

      window.startImageEditor = async function(payload) {
        if (payload.theme === "dark") {
          document.documentElement.setAttribute("data-theme", "dark");
        }
        
        currentFilePath = payload.filePath;
        document.getElementById('editor-filename-display').textContent = payload.filePath.split(/[/\\]/).pop();
        
        const details = await window.electronAPI.getFileDetails(payload.filePath);
        const image = document.getElementById('editor-preview-img');
        if (details.thumbnail) {
          image.src = details.thumbnail;
        } else {
          image.src = 'file://' + payload.filePath;
        }
        originalSrc = image.src;
        
        image.onload = () => {
          if (cropper) cropper.destroy();
          cropper = new Cropper(image, {
            viewMode: 2,
            dragMode: 'move', // Allows panning with mouse drag
            autoCrop: false, // Don't show crop box by default
            guides: false,
            center: false,
            highlight: false,
            cropBoxMovable: false,
            cropBoxResizable: false,
            toggleDragModeOnDblclick: false,
            wheelZoomRatio: 0.1, // Zoom via mouse wheel or 2-finger scroll
            ready: function () {
              const splash = document.getElementById("splash-screen");
              if (splash) {
                splash.style.opacity = '0';
                setTimeout(() => splash.remove(), 400);
              }
            }
          });
        };
      };

      document.getElementById("btn-crop").addEventListener("click", () => {
        if (!cropper) return;
        
        if (!isCroppingMode) {
          // Enter crop mode
          isCroppingMode = true;
          document.getElementById("crop-text").textContent = "Apply Crop";
          document.getElementById("crop-icon").textContent = "check";
          document.getElementById("btn-a4-portrait").style.display = "flex";
          document.getElementById("btn-a4-landscape").style.display = "flex";
          
          // Re-init cropper to properly render grid lines and corners
          cropper.destroy();
          const image = document.getElementById('editor-preview-img');
          cropper = new Cropper(image, {
            viewMode: 2,
            dragMode: 'crop', 
            autoCropArea: 1,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
            wheelZoomRatio: 0.1,
            ready() {
              if (baseRotation !== 0 || straightenAngle !== 0) {
                applyRotation();
              }
            }
          });
        } else {
          // Apply the crop
          const canvas = cropper.getCroppedCanvas();
          if (!canvas) return;
          
          cropper.destroy();
          cropper = null;
          
          const image = document.getElementById('editor-preview-img');
          image.src = canvas.toDataURL("image/png");
          
          isEdited = true;
          isCroppingMode = false;
          
          document.getElementById("crop-text").textContent = "Crop";
          document.getElementById("crop-icon").textContent = "crop";
          document.getElementById("btn-a4-portrait").style.display = "none";
          document.getElementById("btn-a4-landscape").style.display = "none";
          
          // Re-initialize cropper for zooming/panning on the cropped image
          image.onload = () => {
            if (!cropper) {
              cropper = new Cropper(image, {
                viewMode: 2,
                dragMode: 'move',
                autoCrop: false,
                guides: false,
                center: false,
                cropBoxMovable: false,
                cropBoxResizable: false,
                toggleDragModeOnDblclick: false,
                wheelZoomRatio: 0.1,
              });
            }
          };

          // Enable save options
          enableSave();
        }
      });

      document.getElementById("straighten-slider").addEventListener("input", (e) => {
        straightenAngle = parseFloat(e.target.value);
        applyRotation();
      });

      document.getElementById("btn-rotate-left").addEventListener("click", () => {
        baseRotation -= 90;
        applyRotation();
      });

      document.getElementById("btn-rotate-right").addEventListener("click", () => {
        baseRotation += 90;
        applyRotation();
      });

      function setA4Mode(mode) {
        if (a4Mode === mode) {
          a4Mode = null; // toggle off
        } else {
          a4Mode = mode;
        }
        
        const btnP = document.getElementById("btn-a4-portrait");
        const btnL = document.getElementById("btn-a4-landscape");
        
        btnP.style.background = a4Mode === "portrait" ? "var(--bg-hover)" : "";
        btnP.style.borderColor = a4Mode === "portrait" ? "var(--gts-blue)" : "";
        
        btnL.style.background = a4Mode === "landscape" ? "var(--bg-hover)" : "";
        btnL.style.borderColor = a4Mode === "landscape" ? "var(--gts-blue)" : "";
        
        applyRotation();
        
        if (!a4Mode) {
          cropper.setAspectRatio(NaN);
        }
      }

      document.getElementById("btn-a4-portrait").addEventListener("click", () => {
        if (!cropper || !isCroppingMode) return;
        setA4Mode("portrait");
      });

      document.getElementById("btn-a4-landscape").addEventListener("click", () => {
        if (!cropper || !isCroppingMode) return;
        setA4Mode("landscape");
      });

      document.getElementById("btn-redact").addEventListener("click", async () => {
        const btn = document.getElementById("btn-redact");
        if (!cropper || btn.disabled) return;
        
        btn.disabled = true;
        const icon = document.getElementById("redact-icon");
        const text = document.getElementById("redact-text");
        icon.textContent = "sync";
        icon.classList.add("spinning");
        text.textContent = "YOLO Scanning...";
        
        try {
          const canvas = cropper.getCroppedCanvas();
          if (!canvas) throw new Error("Canvas error");
          
          const mode = document.getElementById("redact-mode").value;
          const target = document.getElementById("redact-target").value;
          const dataUrl = canvas.toDataURL("image/png");
          const result = await window.electronAPI.runYoloRedact(dataUrl, mode, target);
          
          if (result.success && result.boxes && result.boxes.length > 0) {
            window.pendingRedactCanvas = canvas;
            window.pendingRedactBoxes = result.boxes;
            
            document.querySelector(".cropper-container").style.display = "none";
            const reviewContainer = document.getElementById("redact-review-container");
            const reviewImg = document.getElementById("redact-review-img");
            const boxesContainer = document.getElementById("redact-boxes-container");
            
            reviewImg.src = dataUrl;
            reviewContainer.style.display = "inline-block";
            
            reviewImg.onload = () => {
              boxesContainer.innerHTML = "";
              // Use naturalWidth to get the true image pixel dimensions after the
              // browser has decoded the dataUrl, avoiding DPI/devicePixelRatio issues.
              const scaleX = reviewImg.clientWidth / reviewImg.naturalWidth;
              const scaleY = reviewImg.clientHeight / reviewImg.naturalHeight;
              
              result.boxes.forEach((box, i) => {
                const boxDiv = document.createElement("div");
                boxDiv.style.position = "absolute";
                boxDiv.style.left = (box.x * scaleX) + "px";
                boxDiv.style.top = (box.y * scaleY) + "px";
                boxDiv.style.width = (box.w * scaleX) + "px";
                boxDiv.style.height = (box.h * scaleY) + "px";
                
                if (mode === "white") boxDiv.style.background = "white";
                else if (mode === "blur") boxDiv.style.backdropFilter = "blur(10px)";
                else boxDiv.style.background = "black";
                
                boxDiv.style.border = "2px dashed red";
                
                let isDragging = false;
                let startX, startY;
                let initialLeft, initialTop;
                
                boxDiv.style.cursor = 'move';
                
                boxDiv.onmousedown = (e) => {
                  if (e.target === closeBtn) return;
                  isDragging = true;
                  startX = e.clientX;
                  startY = e.clientY;
                  initialLeft = parseFloat(boxDiv.style.left);
                  initialTop = parseFloat(boxDiv.style.top);
                  e.preventDefault();
                };
                
                document.addEventListener('mousemove', (e) => {
                  if (!isDragging) return;
                  const dx = e.clientX - startX;
                  const dy = e.clientY - startY;
                  let newLeft = initialLeft + dx;
                  let newTop = initialTop + dy;
                  
                  // constrain to image bounds
                  newLeft = Math.max(0, Math.min(newLeft, reviewImg.clientWidth - boxDiv.offsetWidth));
                  newTop = Math.max(0, Math.min(newTop, reviewImg.clientHeight - boxDiv.offsetHeight));
                  
                  boxDiv.style.left = newLeft + 'px';
                  boxDiv.style.top = newTop + 'px';
                  
                  // Update underlying box coordinates
                  window.pendingRedactBoxes[i].x = newLeft / scaleX;
                  window.pendingRedactBoxes[i].y = newTop / scaleY;
                });
                
                document.addEventListener('mouseup', () => {
                  isDragging = false;
                });
                
                const closeBtn = document.createElement("button");
                closeBtn.innerHTML = "×";
                closeBtn.style.position = "absolute";
                closeBtn.style.top = "-10px";
                closeBtn.style.right = "-10px";
                closeBtn.style.background = "red";
                closeBtn.style.color = "white";
                closeBtn.style.border = "none";
                closeBtn.style.borderRadius = "50%";
                closeBtn.style.width = "20px";
                closeBtn.style.height = "20px";
                closeBtn.style.cursor = "pointer";
                closeBtn.style.display = "flex";
                closeBtn.style.alignItems = "center";
                closeBtn.style.justifyContent = "center";
                closeBtn.style.fontWeight = "bold";
                
                closeBtn.onclick = () => {
                  boxDiv.remove();
                  window.pendingRedactBoxes[i] = null;
                };
                
                boxDiv.appendChild(closeBtn);
                boxesContainer.appendChild(boxDiv);
              });
            };
            
            document.getElementById("btn-redact").style.display = "none";
            document.getElementById("btn-redact-apply").style.display = "flex";
            document.getElementById("btn-redact-cancel").style.display = "flex";
            setDropdownsDisabled(true);
            
            
            showToast(`Found ${result.boxes.length} sensitive areas. Review and apply.`);
          } else if (result.success) {
            showToast("No sensitive areas found by YOLO.");
          } else {
            console.error(result.error);
            showToast("YOLO Error: " + result.error);
          }
        } catch (err) {
          console.error(err);
          showToast("Error during YOLO redaction.");
        } finally {
          btn.disabled = false;
          icon.textContent = "blur_on";
          icon.classList.remove("spinning");
          text.textContent = "Auto-Redact";
        }
      });

      document.getElementById("btn-cancel").addEventListener("click", () => {
        if (!isEdited) return;
        
        // Reset all states
        baseRotation = 0;
        straightenAngle = 0;
        document.getElementById("straighten-slider").value = 0;
        
        if (a4Mode) {
          setA4Mode(null);
        }
        
        if (isCroppingMode) {
          isCroppingMode = false;
          document.getElementById("crop-text").textContent = "Crop";
          document.getElementById("crop-icon").textContent = "crop";
          document.getElementById("btn-a4-portrait").style.display = "none";
          document.getElementById("btn-a4-landscape").style.display = "none";
        }
        
        disableSave();
        
        // Restore original image which triggers onload and resets cropper
        const image = document.getElementById('editor-preview-img');
        image.src = originalSrc;
      });

      async function handleSave(replace) {
        if (!isEdited) return;
        document.getElementById("save-dropdown").classList.remove("show");

        const saveBtn = document.getElementById("btn-save");
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size: 18px; animation: spin 1s linear infinite;">sync</span> Saving...';
        saveBtn.disabled = true;
        
        // Get the final canvas data
        const canvas = cropper ? cropper.getCroppedCanvas() : null;
        const dataUrl = canvas ? canvas.toDataURL("image/png") : document.getElementById('editor-preview-img').src;
        
        const result = await window.electronAPI.saveImage({
          dataUrl,
          originalPath: currentFilePath,
          replace
        });
        
        saveBtn.innerHTML = originalText;
        if (!isEdited) saveBtn.disabled = true;
        
        if (result.success) {
          showToast(`Saved to ${result.path.split(/[/\\]/).pop()}`);
          if (!replace) {
             // update current file path if saved as new
             currentFilePath = result.path;
             document.getElementById('editor-filename-display').textContent = currentFilePath.split(/[/\\]/).pop();
          }
          
          // Reset UI
          disableSave();
        } else {
          showToast(`Error: ${result.error}`);
        }
      }

      document.getElementById("btn-save-replace").addEventListener("click", () => handleSave(true));
      document.getElementById("btn-save-new").addEventListener("click", () => handleSave(false));

      document.getElementById("btn-redact-cancel").addEventListener("click", () => {
        document.getElementById("redact-review-container").style.display = "none";
        document.querySelector(".cropper-container").style.display = "block";
        document.getElementById("btn-redact").style.display = "flex";
        document.getElementById("btn-redact-apply").style.display = "none";
        document.getElementById("btn-redact-cancel").style.display = "none";
        setDropdownsDisabled(false);
        
        
        
        const icon = document.getElementById("redact-icon");
        const text = document.getElementById("redact-text");
        icon.textContent = "blur_on";
        icon.classList.remove("spinning");
        text.textContent = "Auto-Redact";
        document.getElementById("btn-redact").disabled = false;
      });

      document.getElementById("btn-redact-apply").addEventListener("click", () => {
        const ctx = window.pendingRedactCanvas.getContext("2d");
        const mode = document.getElementById("redact-mode").value;
        
        window.pendingRedactBoxes.forEach(box => {
          if (!box) return;
          if (mode === "white") {
            ctx.fillStyle = "white";
            ctx.fillRect(box.x, box.y, box.w, box.h);
          } else if (mode === "blur") {
            ctx.save();
            ctx.filter = `blur(${Math.max(5, box.w/10)}px)`;
            ctx.drawImage(window.pendingRedactCanvas, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
            ctx.restore();
          } else {
            ctx.fillStyle = "black";
            ctx.fillRect(box.x, box.y, box.w, box.h);
          }
        });
        
        const finalDataUrl = window.pendingRedactCanvas.toDataURL("image/png");
        cropper.destroy();
        document.getElementById('editor-preview-img').src = finalDataUrl;
        
        document.getElementById("redact-review-container").style.display = "none";
        document.getElementById('editor-preview-img').style.display = "block";
        document.getElementById("btn-redact").style.display = "flex";
        document.getElementById("btn-redact-apply").style.display = "none";
        document.getElementById("btn-redact-cancel").style.display = "none";
        setDropdownsDisabled(false);
        
        const icon = document.getElementById("redact-icon");
        const text = document.getElementById("redact-text");
        icon.textContent = "blur_on";
        icon.classList.remove("spinning");
        text.textContent = "Auto-Redact";
        document.getElementById("btn-redact").disabled = false;
        
        initCropper();
        enableSave();
        showToast("Redactions applied successfully.");
      });
      
    // Custom Dropdown Logic
      function setupDropdown(id, inputId, labelId, iconId) {
        const btn = document.getElementById('btn-' + id);
        const content = document.getElementById('content-' + id);
        const input = document.getElementById(inputId);
        const label = document.getElementById(labelId);
        const icon = document.getElementById(iconId);
        
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          document.querySelectorAll('.custom-dropdown-content').forEach(c => {
            if(c !== content) c.classList.remove('show');
          });
          content.classList.toggle('show');
        });
        
        content.querySelectorAll('.custom-dropdown-item').forEach(item => {
          item.addEventListener('click', (e) => {
            input.value = item.dataset.value;
            const iconText = item.querySelector('.material-symbols-rounded').textContent;
            label.textContent = item.textContent.replace(iconText, '').trim();
            icon.textContent = iconText;
            content.classList.remove('show');
          });
        });
      }
      
      setupDropdown('dd-target', 'redact-target', 'target-label', 'target-icon');
      setupDropdown('dd-mode', 'redact-mode', 'mode-label', 'mode-icon');
      
      document.addEventListener('click', () => {
        document.querySelectorAll('.custom-dropdown-content').forEach(c => c.classList.remove('show'));
      });
      
      function setDropdownsDisabled(disabled) {
        const ddt = document.getElementById('dd-target');
        const ddm = document.getElementById('dd-mode');
        if (disabled) {
          ddt.classList.add('disabled');
          ddm.classList.add('disabled');
        } else {
          ddt.classList.remove('disabled');
          ddm.classList.remove('disabled');
        }
      }

    

document.getElementById('editor-back-normal-btn').addEventListener('click', () => {
    document.getElementById('editor-right-resizer').style.display = 'none';
    document.getElementById('editor-options-panel').style.display = 'none';
    document.getElementById('editor-edit-btn').style.display = 'flex';
    if(cropper) {
        cropper.destroy();
        cropper = null;
    }
    const btnCancel = document.getElementById("btn-cancel");
    if(btnCancel) btnCancel.click(); // Reset state
});

