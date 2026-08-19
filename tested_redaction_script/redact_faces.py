import os
import sys
import warnings
from pathlib import Path
import numpy as np
import cv2
import insightface
from insightface.app import FaceAnalysis

# Suppress onnxruntime provider fallback warnings on macOS/CPU
warnings.filterwarnings("ignore", category=UserWarning)


def init_insightface_app(det_size=(1280, 1280), det_thresh=0.35):
    """
    Initializes InsightFace FaceAnalysis for detection with SCRFD (1280px multi-scale pyramid).
    """
    providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
    app = FaceAnalysis(allowed_modules=["detection"], providers=providers)
    app.prepare(ctx_id=0, det_size=det_size, det_thresh=det_thresh)
    return app


def redact_image_with_insightface(img, app, expand_ratio=0.20):
    """
    Detects faces with InsightFace, expands each box by 20%, applies blur,
    draws red borders, and overlays top-right count badge.
    """
    img_h, img_w = img.shape[:2]
    faces = app.get(img)
    count = len(faces) if faces is not None else 0

    diag = (img_w**2 + img_h**2) ** 0.5
    border_thickness = max(2, int(round(diag / 600)))
    font_scale = max(0.7, diag / 1600)
    font_thickness = max(2, int(round(font_scale * 2.2)))

    if faces is not None and len(faces) > 0:
        for face in faces:
            bbox = face.bbox.astype(int)
            x1, y1, x2, y2 = bbox

            w = x2 - x1
            h = y2 - y1
            if w <= 0 or h <= 0:
                continue

            # Expand bounding box by 20% for complete privacy coverage
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

            # Multi-pass Gaussian & box blur
            roi = img[ey1:ey2, ex1:ex2]
            ksize = max(15, (min(ew, eh) // 3) | 1)
            blurred_roi = cv2.GaussianBlur(roi, (ksize, ksize), 0)
            blurred_roi = cv2.blur(blurred_roi, (max(5, (ksize // 2) | 1), max(5, (ksize // 2) | 1)))
            img[ey1:ey2, ex1:ex2] = blurred_roi

            # Red border
            cv2.rectangle(img, (ex1, ey1), (ex2, ey2), (0, 0, 255), border_thickness)

    # Top-right count badge
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

    return img, count


def redact_image(image_path: str, det_size=(1280, 1280), det_thresh=0.35, expand_ratio=0.20):
    clean_path = image_path.strip().strip("'\"").replace("\\ ", " ")
    img_file = Path(clean_path).expanduser().resolve()

    if not img_file.exists() or not img_file.is_file():
        print(f"\n[Error] Image file not found at: {clean_path}")
        return None

    img = cv2.imread(str(img_file))
    if img is None:
        print(f"\n[Error] Could not decode image from: {img_file}")
        return None

    img_h, img_w = img.shape[:2]

    print(f"\nInitializing InsightFace (SCRFD detection only, det_size={det_size}, det_thresh={det_thresh})...")
    app = init_insightface_app(det_size=det_size, det_thresh=det_thresh)

    print(f"Processing image: {img_file.name} ({img_w}x{img_h})...")
    redacted_img, count = redact_image_with_insightface(img, app, expand_ratio=expand_ratio)
    print(f"Total faces redacted: {count}")

    output_filename = f"{img_file.stem}_redacted{img_file.suffix}"
    output_path = img_file.parent / output_filename

    success = cv2.imwrite(str(output_path), redacted_img)
    if success:
        print(f"\n[Success] Redacted image saved to: {output_path}\n")
        return output_path
    else:
        print(f"\n[Error] Failed to save output image to: {output_path}\n")
        return None


def main():
    print("=" * 60)
    print("   InsightFace (SCRFD) Native Face Redaction Tool")
    print("=" * 60)

    if len(sys.argv) > 1:
        image_path = " ".join(sys.argv[1:])
    else:
        try:
            image_path = input("Enter the path to the image: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nExiting...")
            sys.exit(0)

    if not image_path:
        print("No image path entered. Exiting.")
        sys.exit(1)

    redact_image(image_path, det_size=(1280, 1280), det_thresh=0.35, expand_ratio=0.20)


if __name__ == "__main__":
    main()
