const fs = require('fs');

// 1. Update preload.js
let preload = fs.readFileSync('preload.js', 'utf8');
preload = preload.replace(
  'runYoloRedact: (dataUrl, mode) => ipcRenderer.invoke("run-yolo-redact", dataUrl, mode)',
  'runYoloRedact: (dataUrl, mode, target) => ipcRenderer.invoke("run-yolo-redact", dataUrl, mode, target)'
);
fs.writeFileSync('preload.js', preload);

// 2. Update main.js
let main = fs.readFileSync('main.js', 'utf8');
main = main.replace(
  'ipcMain.handle("run-yolo-redact", async (event, dataUrl, mode = "black") => {',
  'ipcMain.handle("run-yolo-redact", async (event, dataUrl, mode = "black", target = "faces") => {'
);
main = main.replace(
  'exec(`"${pythonPath}" "${scriptPath}" "${tempIn}" "${tempOut}" "${mode}"`',
  'exec(`"${pythonPath}" "${scriptPath}" "${tempIn}" "${tempOut}" "${mode}" "${target}"`'
);
fs.writeFileSync('main.js', main);

// 3. Update image-editor-window.html
let html = fs.readFileSync('image-editor-window.html', 'utf8');

const targetDropdownHTML = `<select id="redact-target" class="action-btn" style="background-color: transparent; color: white; border: 1px solid rgba(255,255,255,0.2); margin-right: 8px; cursor: pointer;">
          <option value="faces" style="color: black;">👤 Faces</option>
          <option value="plates" style="color: black;">🚗 Plates</option>
        </select>`;

html = html.replace(
  '<select id="redact-mode"',
  targetDropdownHTML + '\n        <select id="redact-mode"'
);

html = html.replace(
  'const mode = document.getElementById("redact-mode").value;',
  `const mode = document.getElementById("redact-mode").value;
          const target = document.getElementById("redact-target").value;`
);

html = html.replace(
  'const result = await window.electronAPI.runYoloRedact(dataUrl, mode);',
  'const result = await window.electronAPI.runYoloRedact(dataUrl, mode, target);'
);

html = html.replace(
  'document.getElementById("redact-mode").disabled = true;',
  `document.getElementById("redact-mode").disabled = true;
            document.getElementById("redact-target").disabled = true;`
);

html = html.replace(
  'document.getElementById("redact-mode").disabled = false;',
  `document.getElementById("redact-mode").disabled = false;
        document.getElementById("redact-target").disabled = false;`
);

// We need to replace the second instance as well (in cancel)
html = html.replace(
  'document.getElementById("redact-mode").disabled = false;',
  `document.getElementById("redact-mode").disabled = false;
        document.getElementById("redact-target").disabled = false;`
);

fs.writeFileSync('image-editor-window.html', html);
console.log("HTML, preload, and main updated");

// 4. Update yolo_redact.py
let py = fs.readFileSync('yolo_redact.py', 'utf8');
const targetArg = `mode = sys.argv[3] if len(sys.argv) > 3 else "black"
    target_type = sys.argv[4] if len(sys.argv) > 4 else "faces"`;

py = py.replace('mode = sys.argv[3] if len(sys.argv) > 3 else "black"', targetArg);

const loopLogic = `    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    plate_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_russian_plate_number.xml')
    
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            
            # Check target match
            if target_type == "faces" and cls_id != 0:
                continue
            if target_type == "plates" and cls_id not in [2, 3, 5, 7]:
                continue
                
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            w = x2 - x1
            h = y2 - y1
            
            if target_type == "faces":
                # Crop upper body
                upper_body_y2 = y1 + int(h * 0.4)
                upper_body_roi = img[y1:upper_body_y2, x1:x2]
                
                faces = []
                if upper_body_roi.size > 0:
                    gray_roi = cv2.cvtColor(upper_body_roi, cv2.COLOR_BGR2GRAY)
                    faces = face_cascade.detectMultiScale(gray_roi, scaleFactor=1.1, minNeighbors=3, minSize=(20, 20))
                
                if len(faces) > 0:
                    for (fx, fy, fw, fh) in faces:
                        abs_fx1 = x1 + fx
                        abs_fy1 = y1 + fy
                        abs_fx2 = abs_fx1 + fw
                        abs_fy2 = abs_fy1 + fh
                        
                        pad_x = 0
                        pad_y = int(fh * 0.05)
                        
                        nx1 = max(0, abs_fx1 - pad_x)
                        ny1 = max(0, abs_fy1 - pad_y)
                        nx2 = min(img.shape[1], abs_fx2 + pad_x)
                        ny2 = min(img.shape[0], abs_fy2 + pad_y)
                        
                        boxes_out.append({"x": int(nx1), "y": int(ny1), "w": int(nx2 - nx1), "h": int(ny2 - ny1)})
                else:
                    face_w = w * 0.25
                    face_h = face_w * 1.3
                    cx = x1 + w / 2
                    nx1 = int(cx - face_w / 2)
                    ny1 = int(y1 + w * 0.02)
                    nx2 = int(cx + face_w / 2)
                    ny2 = int(ny1 + face_h)
                    
                    nx1 = max(0, nx1)
                    ny1 = max(0, ny1)
                    nx2 = min(img.shape[1], nx2)
                    ny2 = min(img.shape[0], ny2)
                    boxes_out.append({"x": int(nx1), "y": int(ny1), "w": int(nx2 - nx1), "h": int(ny2 - ny1)})
            
            elif target_type == "plates":
                # Search for license plate in vehicle ROI
                vehicle_roi = img[y1:y2, x1:x2]
                plates = []
                if vehicle_roi.size > 0:
                    gray_roi = cv2.cvtColor(vehicle_roi, cv2.COLOR_BGR2GRAY)
                    plates = plate_cascade.detectMultiScale(gray_roi, scaleFactor=1.1, minNeighbors=3, minSize=(10, 10))
                
                if len(plates) > 0:
                    for (px, py, pw, ph) in plates:
                        abs_px1 = x1 + px
                        abs_py1 = y1 + py
                        abs_px2 = abs_px1 + pw
                        abs_py2 = abs_py1 + ph
                        
                        nx1 = max(0, abs_px1)
                        ny1 = max(0, abs_py1)
                        nx2 = min(img.shape[1], abs_px2)
                        ny2 = min(img.shape[0], abs_py2)
                        
                        boxes_out.append({"x": int(nx1), "y": int(ny1), "w": int(nx2 - nx1), "h": int(ny2 - ny1)})`;

const regex = /    face_cascade = cv2\.CascadeClassifier\([\s\S]*?(?=    print\(json\.dumps\()/;
py = py.replace(regex, loopLogic + '\n                \n');
fs.writeFileSync('yolo_redact.py', py);
console.log("Python updated");

