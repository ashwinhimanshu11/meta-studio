const fs = require('fs');
let html = fs.readFileSync('image-editor-window.html', 'utf8');

const targetStr = `boxDiv.style.border = "2px dashed red";`;
const dragCode = `boxDiv.style.border = "2px dashed red";
                
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
                });`;

if (html.includes(targetStr) && !html.includes("isDragging = false")) {
  html = html.replace(targetStr, dragCode);
  fs.writeFileSync('image-editor-window.html', html);
  console.log("Updated HTML with drag support");
} else {
  console.log("Could not find target string or already updated");
}
