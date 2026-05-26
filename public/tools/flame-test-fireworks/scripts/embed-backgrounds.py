"""Generate background-scenes-embedded.js with data URLs for file:// export."""
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BG_DIR = ROOT / "assets" / "backgrounds"
OUT = ROOT / "js" / "background-scenes-embedded.js"

SCENES = [
    ("city-skyline", "city-skyline.png"),
    ("city-skyline-1", "city-skyline-1.png"),
    ("city-skyline-2", "city-skyline-2.png"),
    ("city-skyline-3", "city-skyline-3.png"),
    ("city-skyline-4", "city-skyline-4.png"),
    ("city-skyline-5", "city-skyline-5.png"),
]

def main():
    data = {}
    try:
        from PIL import Image
        import io

        has_pil = True
    except ImportError:
        has_pil = False

    for sid, fname in SCENES:
        path = BG_DIR / fname
        if not path.exists():
            print("missing", path)
            continue
        if has_pil:
            im = Image.open(path)
            im.thumbnail((1280, 720), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            im.save(buf, format="JPEG", quality=82, optimize=True)
            b64 = base64.b64encode(buf.getvalue()).decode("ascii")
            data[sid] = "data:image/jpeg;base64," + b64
            print(sid, len(b64) // 1024, "KB jpeg")
        else:
            raw = path.read_bytes()
            b64 = base64.b64encode(raw).decode("ascii")
            data[sid] = "data:image/png;base64," + b64
            print(sid, len(b64) // 1024, "KB png")

    content = (
        "/* Auto-generated — run scripts/embed-backgrounds.py to refresh */\n"
        "const SCENE_DATA_URLS = "
        + json.dumps(data, indent=2)
        + ";\n"
    )
    OUT.write_text(content, encoding="utf-8")
    print("wrote", OUT, OUT.stat().st_size // 1024, "KB total")

if __name__ == "__main__":
    main()
