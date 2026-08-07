const fs = require('fs');
let html = fs.readFileSync('image-editor-window.html', 'utf8');

// 1. Add redact review container
html = html.replace(
  '<img id="editor-image" src="" alt="Editor Image" />',
  `<img id="editor-image" src="" alt="Editor Image" />
        <div id="redact-review-container" style="display: none; position: relative; max-width: 100%; max-height: 100%;">
          <img id="redact-review-img" src="" style="display: block; max-width: 100%; max-height: 100%;" />
          <div id="redact-boxes-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
        </div>`
);

// 2. Add Apply/Cancel buttons
html = html.replace(
  '<button id="btn-redact" class="action-btn" title="YOLO Auto-Redact">',
  `<button id="btn-redact-apply" class="action-btn" style="display: none; background-color: var(--gts-blue); border-color: var(--gts-blue);">
          <span class="material-symbols-rounded" style="font-size: 18px;">check</span> <span>Apply</span>
        </button>
        <button id="btn-redact-cancel" class="action-btn" style="display: none;">
          <span class="material-symbols-rounded" style="font-size: 18px;">close</span> <span>Cancel</span>
        </button>
        <button id="btn-redact" class="action-btn" title="YOLO Auto-Redact">`
);

// 3. Update btn-redact click handler
const oldRedactHandler = `          if (result.success && result.count > 0) {
            cropper.destroy();
            const image = document.getElementById("editor-image");
            image.src = result.dataUrl;
            showToast(\`YOLO Redacted \${result.count} sensitive areas.\`);
            enableSave();
          } else if (result.success) {
            showToast("No sensitive areas found by YOLO.");
          }`;

const newRedactHandler = `          if (result.success && result.boxes && result.boxes.length > 0) {
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
              const scaleX = reviewImg.clientWidth / canvas.width;
              const scaleY = reviewImg.clientHeight / canvas.height;
              
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
            document.getElementById("redact-mode").disabled = true;
            
            showToast(\`Found \${result.boxes.length} sensitive areas. Review and apply.\`);
          } else if (result.success) {
            showToast("No sensitive areas found by YOLO.");
          }`;

html = html.replace(oldRedactHandler, newRedactHandler);

// 4. Add Apply/Cancel logic
const scriptEnd = '    </script>';
const applyCancelLogic = `
      document.getElementById("btn-redact-cancel").addEventListener("click", () => {
        document.getElementById("redact-review-container").style.display = "none";
        document.querySelector(".cropper-container").style.display = "block";
        document.getElementById("btn-redact").style.display = "flex";
        document.getElementById("btn-redact-apply").style.display = "none";
        document.getElementById("btn-redact-cancel").style.display = "none";
        document.getElementById("redact-mode").disabled = false;
        
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
            ctx.filter = \`blur(\${Math.max(5, box.w/10)}px)\`;
            ctx.drawImage(window.pendingRedactCanvas, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
            ctx.restore();
          } else {
            ctx.fillStyle = "black";
            ctx.fillRect(box.x, box.y, box.w, box.h);
          }
        });
        
        const finalDataUrl = window.pendingRedactCanvas.toDataURL("image/png");
        cropper.destroy();
        document.getElementById("editor-image").src = finalDataUrl;
        
        document.getElementById("redact-review-container").style.display = "none";
        document.getElementById("editor-image").style.display = "block";
        document.getElementById("btn-redact").style.display = "flex";
        document.getElementById("btn-redact-apply").style.display = "none";
        document.getElementById("btn-redact-cancel").style.display = "none";
        document.getElementById("redact-mode").disabled = false;
        
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
      
    </script>`;

html = html.replace(scriptEnd, applyCancelLogic);

fs.writeFileSync('image-editor-window.html', html);
console.log("Updated HTML successfully.");
