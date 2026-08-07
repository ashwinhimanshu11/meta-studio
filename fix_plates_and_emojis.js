const fs = require('fs');

// 1. Remove emojis from image-editor-window.html
let html = fs.readFileSync('image-editor-window.html', 'utf8');

html = html.replace('⬛ Black Box', 'Black Box');
html = html.replace('⬜ White Box', 'White Box');
html = html.replace('🌫️ Blur', 'Blur');

html = html.replace('👤 Faces', 'Faces');
html = html.replace('🚗 Plates', 'Plates');

fs.writeFileSync('image-editor-window.html', html);
console.log("HTML emojis removed.");

// 2. Fix yolo_redact.py
let py = fs.readFileSync('yolo_redact.py', 'utf8');

// Update detectMultiScale
py = py.replace(
  'plates = plate_cascade.detectMultiScale(gray_roi, scaleFactor=1.1, minNeighbors=3, minSize=(10, 10))',
  'plates = plate_cascade.detectMultiScale(gray_roi, scaleFactor=1.05, minNeighbors=2, minSize=(10, 10))'
);

// Add fallback heuristic
const oldPlateBlock = `                        nx2 = min(img.shape[1], abs_px2)
                        ny2 = min(img.shape[0], abs_py2)
                        
                        boxes_out.append({"x": int(nx1), "y": int(ny1), "w": int(nx2 - nx1), "h": int(ny2 - ny1)})`;

const newPlateBlock = `                        nx2 = min(img.shape[1], abs_px2)
                        ny2 = min(img.shape[0], abs_py2)
                        
                        boxes_out.append({"x": int(nx1), "y": int(ny1), "w": int(nx2 - nx1), "h": int(ny2 - ny1)})
                else:
                    plate_w = w * 0.3
                    plate_h = plate_w * 0.25
                    cx = x1 + w / 2
                    cy = y1 + h * 0.85
                    
                    nx1 = int(cx - plate_w / 2)
                    ny1 = int(cy - plate_h / 2)
                    nx2 = int(cx + plate_w / 2)
                    ny2 = int(cy + plate_h / 2)
                    
                    nx1 = max(0, nx1)
                    ny1 = max(0, ny1)
                    nx2 = min(img.shape[1], nx2)
                    ny2 = min(img.shape[0], ny2)
                    
                    boxes_out.append({"x": int(nx1), "y": int(ny1), "w": int(nx2 - nx1), "h": int(ny2 - ny1)})`;

py = py.replace(oldPlateBlock, newPlateBlock);

fs.writeFileSync('yolo_redact.py', py);
console.log("Python plate logic updated.");

