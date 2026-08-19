import os
import sys
import json
import warnings
from pathlib import Path
import io
import contextlib

# Suppress onnxruntime warnings
warnings.filterwarnings("ignore", category=UserWarning)


def init_insightface_app(det_size=(1280, 1280), det_thresh=0.35):
    # Suppress insightface log prints during model loading
    f = io.StringIO()
    with contextlib.redirect_stdout(f), contextlib.redirect_stderr(f):
        import insightface
        from insightface.app import FaceAnalysis
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        app = FaceAnalysis(allowed_modules=["detection"], providers=providers)
        app.prepare(ctx_id=0, det_size=det_size, det_thresh=det_thresh)
    return app


def redact_image_insightface(
    img,
    app,
    mode="blur",
    expand_ratio=0.20,
    draw_count_badge=False
):
    import cv2
    img_h, img_w = img.shape[:2]
    
    f = io.StringIO()
    with contextlib.redirect_stdout(f), contextlib.redirect_stderr(f):
        faces = app.get(img)
        
    count = len(faces) if faces is not None else 0
    expanded_boxes = []

    mode = (mode or "blur").strip().lower()

    if faces is not None and len(faces) > 0:
        for face in faces:
            bbox = face.bbox.astype(int)
            x1, y1, x2, y2 = bbox

            w = x2 - x1
            h = y2 - y1
            if w <= 0 or h <= 0:
                continue

            # 20% Bounding box privacy expansion
            pad_x = int(w * (expand_ratio / 2.0))
            pad_y = int(h * (expand_ratio / 2.0))

            ex1 = max(0, x1 - pad_x)
            ey1 = max(0, y1 - pad_y)
            ex2 = min(img_w, x2 + pad_x)
            ey2 = min(img_h, y2 + pad_y)

            ew = ex2 - ex1
            eh = ey2 - ey1
            if ew <= 0 or eh <= 0:
                continue

            expanded_boxes.append({
                "x": int(ex1),
                "y": int(ey1),
                "w": int(ew),
                "h": int(eh)
            })

            roi = img[ey1:ey2, ex1:ex2]

            if mode == "black":
                cv2.rectangle(img, (ex1, ey1), (ex2, ey2), (0, 0, 0), -1)
            elif mode == "white":
                cv2.rectangle(img, (ex1, ey1), (ex2, ey2), (255, 255, 255), -1)
            else:  # mode == "blur"
                # Multi-pass dual Gaussian + Box blur (clean, no border)
                ksize = max(15, (min(ew, eh) // 3) | 1)
                blurred_roi = cv2.GaussianBlur(roi, (ksize, ksize), 0)
                blurred_roi = cv2.blur(
                    blurred_roi,
                    (max(5, (ksize // 2) | 1), max(5, (ksize // 2) | 1))
                )
                img[ey1:ey2, ex1:ex2] = blurred_roi

    # Optional top-right count badge (disabled by default)
    if draw_count_badge:
        diag = (img_w**2 + img_h**2) ** 0.5
        border_thickness = max(2, int(round(diag / 600)))
        font_scale = max(0.7, diag / 1600)
        font_thickness = max(2, int(round(font_scale * 2.2)))

        count_text = f"Count: {count}"
        font = cv2.FONT_HERSHEY_SIMPLEX
        (text_w, text_h), baseline = cv2.getTextSize(count_text, font, font_scale, font_thickness)

        padding = max(10, int(font_scale * 14))
        margin = max(14, int(font_scale * 18))

        badge_x2 = img_w - margin
        badge_x1 = badge_x2 - text_w - (padding * 2)
        badge_y1 = margin
        badge_y2 = badge_y1 + text_h + (padding * 2)

        overlay = img.copy()
        cv2.rectangle(overlay, (badge_x1, badge_y1), (badge_x2, badge_y2), (20, 20, 20), -1)
        cv2.rectangle(overlay, (badge_x1, badge_y1), (badge_x2, badge_y2), (0, 0, 255), max(1, border_thickness // 2))
        cv2.addWeighted(overlay, 0.75, img, 0.25, 0, img)

        text_x = badge_x1 + padding
        text_y = badge_y2 - padding - (baseline // 2)
        cv2.putText(img, count_text, (text_x, text_y), font, font_scale, (255, 255, 255), font_thickness, cv2.LINE_AA)

    return img, count, expanded_boxes


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: python insightface_redact.py <input> <output> [mode] [target] [det_thresh] [expand_ratio]"}))
        sys.exit(1)

    import cv2
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    mode = sys.argv[3] if len(sys.argv) > 3 else "blur"
    target = sys.argv[4] if len(sys.argv) > 4 else "faces"
    det_thresh = float(sys.argv[5]) if len(sys.argv) > 5 else 0.35
    expand_ratio = float(sys.argv[6]) if len(sys.argv) > 6 else 0.20

    img = cv2.imread(input_path)
    if img is None:
        print(json.dumps({"success": False, "error": f"Failed to read input image from {input_path}"}))
        sys.exit(1)

    try:
        app = init_insightface_app(det_size=(1280, 1280), det_thresh=det_thresh)
        redacted_img, count, boxes = redact_image_insightface(
            img,
            app,
            mode=mode,
            expand_ratio=expand_ratio,
            draw_count_badge=False
        )

        out_dir = os.path.dirname(os.path.abspath(output_path))
        if out_dir and not os.path.exists(out_dir):
            os.makedirs(out_dir, exist_ok=True)

        success = cv2.imwrite(output_path, redacted_img)
        if not success:
            print(json.dumps({"success": False, "error": f"Failed to save redacted image to {output_path}"}))
            sys.exit(1)

        print(json.dumps({
            "success": True,
            "count": count,
            "boxes": boxes,
            "output_path": output_path
        }))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
