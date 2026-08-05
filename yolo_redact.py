import sys
import cv2
import json
import urllib.request
import os
from ultralytics import YOLO

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python yolo_redact.py <input_img> <output_img>"}))
        sys.exit(1)
        
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    # Use yolov8n-face model
    model_path = 'yolov8n-face.pt'
    if not os.path.exists(model_path):
        url = "https://github.com/akanametov/yolo-face/releases/download/v0.0.0/yolov8n-face.pt"
        try:
            urllib.request.urlretrieve(url, model_path)
        except Exception as e:
            # Fallback to standard yolov8n (detects person)
            model_path = 'yolov8n.pt'
    
    try:
        model = YOLO(model_path)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
    
    img = cv2.imread(input_path)
    if img is None:
        print(json.dumps({"error": "Cannot read image"}))
        sys.exit(1)
        
    results = model(img)
    redacted_count = 0
    
    for r in results:
        for box in r.boxes:
            # If using standard yolov8n, only redact class 0 (person)
            if 'face' not in model_path and int(box.cls[0]) != 0:
                continue
                
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            
            w = x2 - x1
            h = y2 - y1
            
            # Pad the box to ensure full coverage
            pad_x = int(w * 0.15)
            pad_y = int(h * 0.2)
            
            nx1 = max(0, x1 - pad_x)
            ny1 = max(0, y1 - pad_y)
            nx2 = min(img.shape[1], x2 + pad_x)
            ny2 = min(img.shape[0], y2 + pad_y)
            
            cv2.rectangle(img, (nx1, ny1), (nx2, ny2), (0, 0, 0), -1)
            redacted_count += 1
            
    cv2.imwrite(output_path, img)
    print(json.dumps({"success": True, "redactedCount": redacted_count, "output": output_path}))

if __name__ == '__main__':
    main()
