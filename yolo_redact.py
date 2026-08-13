import sys
import cv2
import json
import os
from ultralytics import YOLO

def apply_redaction(img, nx1, ny1, nx2, ny2, mode):
    mode = mode.strip().lower()
    if nx2 <= nx1 or ny2 <= ny1:
        return
    if mode == "white":
        cv2.rectangle(img, (nx1, ny1), (nx2, ny2), (255, 255, 255), -1)
    elif mode == "blur":
        roi = img[ny1:ny2, nx1:nx2]
        if roi.size > 0:
            h, w = roi.shape[:2]
            k_w = max(15, (w // 10) * 2 + 1)
            k_h = max(15, (h // 10) * 2 + 1)
            # Ensure odd
            if k_w % 2 == 0: k_w += 1
            if k_h % 2 == 0: k_h += 1
            roi_blurred = cv2.GaussianBlur(roi, (k_w, k_h), 25)
            img[ny1:ny2, nx1:nx2] = roi_blurred
    else:
        # Default is black
        cv2.rectangle(img, (nx1, ny1), (nx2, ny2), (0, 0, 0), -1)

def process_video(input_path, output_path, model, face_cascade, mode="blur", target_type="faces"):
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        print(json.dumps({"error": f"Cannot open video {input_path}"}))
        sys.exit(1)
        
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    if fps <= 0 or fps != fps: # NaN check
        fps = 30.0
        
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    frame_idx = 0
    last_reported_pct = -1
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        frame_idx += 1
        
        # Predict on frame with optimized resolution (imgsz=480 for 5x speedup)
        results = model.predict(frame, imgsz=480, verbose=False)
        
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                if cls_id != 0: # person class
                    continue
                    
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                w = x2 - x1
                h = y2 - y1
                
                upper_body_y2 = min(height, y1 + int(h * 0.45))
                upper_body_roi = frame[y1:upper_body_y2, x1:x2]
                
                faces = []
                if upper_body_roi.size > 0:
                    gray_roi = cv2.cvtColor(upper_body_roi, cv2.COLOR_BGR2GRAY)
                    faces = face_cascade.detectMultiScale(gray_roi, scaleFactor=1.1, minNeighbors=3, minSize=(20, 20))
                
                if len(faces) > 0:
                    for (fx, fy, fw, fh) in faces:
                        abs_fx1 = max(0, x1 + fx)
                        abs_fy1 = max(0, y1 + fy)
                        abs_fx2 = min(width, abs_fx1 + fw)
                        abs_fy2 = min(height, abs_fy1 + fh)
                        apply_redaction(frame, abs_fx1, abs_fy1, abs_fx2, abs_fy2, mode)
                else:
                    face_w = w * 0.3
                    face_h = face_w * 1.3
                    cx = x1 + w / 2
                    nx1 = max(0, int(cx - face_w / 2))
                    ny1 = max(0, int(y1 + w * 0.02))
                    nx2 = min(width, int(cx + face_w / 2))
                    ny2 = min(height, int(ny1 + face_h))
                    apply_redaction(frame, nx1, ny1, nx2, ny2, mode)
                    
        out.write(frame)
        
        if total_frames > 0:
            pct = int((frame_idx / total_frames) * 100)
            if pct != last_reported_pct:
                print(f"PROGRESS:{pct}", flush=True)
                sys.stdout.flush()
                last_reported_pct = pct
                
    cap.release()
    out.release()
    print(json.dumps({"success": True}))

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python yolo_redact.py <input> <output> [mode]"}))
        sys.exit(1)
        
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    mode = sys.argv[3] if len(sys.argv) > 3 else "black"
    target_type = sys.argv[4] if len(sys.argv) > 4 else "faces"
    
    os.environ["YOLO_VERBOSE"] = "False"
    model_path = 'yolov8n.pt'
    
    try:
        model = YOLO(model_path)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
        
    try:
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        plate_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_russian_plate_number.xml')
    except Exception:
        face_cascade = None
        plate_cascade = None
    
    is_video = input_path.lower().endswith(('.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'))
    if is_video:
        process_video(input_path, output_path, model, face_cascade, mode, target_type)
        return

    img = cv2.imread(input_path)
    if img is None:
        print(json.dumps({"error": "Cannot read image"}))
        sys.exit(1)
        
    results = model.predict(img, verbose=False)
    boxes_out = []
    
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
                vehicle_roi = img[y1:y2, x1:x2]
                plates = []
                if vehicle_roi.size > 0:
                    gray_roi = cv2.cvtColor(vehicle_roi, cv2.COLOR_BGR2GRAY)
                    plates = plate_cascade.detectMultiScale(gray_roi, scaleFactor=1.05, minNeighbors=2, minSize=(10, 10))
                
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
                    
                    boxes_out.append({"x": int(nx1), "y": int(ny1), "w": int(nx2 - nx1), "h": int(ny2 - ny1)})
                
    print(json.dumps({"success": True, "boxes": boxes_out}))

if __name__ == '__main__':
    main()
