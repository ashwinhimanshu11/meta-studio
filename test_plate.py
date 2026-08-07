import cv2

img = cv2.imread('/var/folders/w_/0n6b97l97zjfsb_s8qn6n5br0000gn/T/TemporaryItems/NSIRD_screencaptureui_kWMChs/Screenshot 2026-08-07 at 16.01.13.png')
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

cascade1 = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_russian_plate_number.xml')
plates1 = cascade1.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=2, minSize=(10, 10))
print("Cascade 1:", len(plates1))

cascade2 = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_license_plate_rus_16stages.xml')
plates2 = cascade2.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=2, minSize=(10, 10))
print("Cascade 2:", len(plates2))
