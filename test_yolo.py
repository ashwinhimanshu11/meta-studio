from ultralytics import YOLO
model = YOLO('yolov8n.pt')
results = model('/var/folders/w_/0n6b97l97zjfsb_s8qn6n5br0000gn/T/TemporaryItems/NSIRD_screencaptureui_kWMChs/Screenshot 2026-08-07 at 16.01.13.png')
for r in results:
    for box in r.boxes:
        print("Class:", int(box.cls[0]), "Box:", box.xyxy[0].tolist())
