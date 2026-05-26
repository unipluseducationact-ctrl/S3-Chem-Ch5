"""Generate or import Interactive Tools card thumbnail for Flame Test Fireworks."""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "images" / "interactive-tools-flame-fireworks-preview.png"
DEFAULT_SOURCE = ROOT / "images" / "flame-fireworks-thumb-source.png"
BG = ROOT / "public" / "tools" / "flame-test-fireworks" / "assets" / "backgrounds" / "city-skyline-2.png"

W, H = 1200, 675
CIRCLE_RADIUS = 7

SKY = {
    "sky_top": 0.04,
    "sky_bottom": 2 / 3,
    "margin_x": 0.04,
    "slot_spread": 0.94,
    "pattern_size_slots": 3,
    "pattern_scale": 1.0,
    "layer_x": [0.06, 0.25, 0.5, 0.75, 0.94],
    "layer_y": [0.52, 0.56, 0.36, 0.5, 0.48],
}

SHELLS = [
    {"primary": "#FFD54F", "accents": ["#DC143C", "#26C6DA", "#CE93D8", "#FFFFFF", "#66BB6A"]},
    {"primary": "#CE93D8", "accents": ["#FFD54F", "#DC143C", "#26C6DA", "#FFFFFF", "#E64A19"]},
    {"primary": "#DC143C", "accents": ["#FFD54F", "#26C6DA", "#CE93D8", "#FFFFFF", "#66BB6A"]},
    {"primary": "#26C6DA", "accents": ["#FFD54F", "#DC143C", "#CE93D8", "#FFFFFF", "#E64A19"]},
    {"primary": "#FFFFFF", "accents": ["#FFD54F", "#DC143C", "#26C6DA", "#CE93D8", "#66BB6A"]},
]


def burst_xy(index: int) -> tuple[float, float]:
    top = H * SKY["sky_top"]
    bottom = H * SKY["sky_bottom"]
    band_h = bottom - top
    inset = W * SKY["margin_x"]
    span = W - inset * 2
    spread = SKY["slot_spread"]
    x0 = inset + span * ((1 - spread) / 2)
    x = x0 + span * spread * SKY["layer_x"][index]
    y = top + band_h * SKY["layer_y"][index]
    return x, y


def max_outer_radius() -> float:
    top = H * SKY["sky_top"]
    bottom = H * SKY["sky_bottom"]
    band_h = bottom - top
    inset = W * SKY["margin_x"]
    span = W - inset * 2
    spread = SKY["slot_spread"]
    scale = SKY["pattern_scale"]
    size_slots = SKY["pattern_size_slots"]
    slot_spacing = (span * spread) / (size_slots + 1)
    max_w = slot_spacing * 0.6 * scale
    clears = []
    for yf in SKY["layer_y"]:
        y = top + band_h * yf
        clears.append(min(y - top, bottom - y))
    max_h = min(clears) * 0.97 * scale
    return min(max_w, max_h, band_h * 0.4 * scale)


def cover_crop(img: Image.Image, width: int, height: int) -> Image.Image:
    w, h = img.size
    scale = max(width / w, height / h)
    nw, nh = int(w * scale), int(h * scale)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - width) // 2
    top = (nh - height) // 2
    return resized.crop((left, top, left + width, top + height))


def import_source(path: Path) -> Image.Image:
    return cover_crop(Image.open(path).convert("RGB"), W, H)


def draw_glow_dot(draw: ImageDraw.ImageDraw, x: float, y: float, color: str, r: int) -> None:
    rgb = tuple(int(color[i : i + 2], 16) for i in (1, 3, 5))
    glow = tuple(min(255, c + 35) for c in rgb)
    draw.ellipse((x - r - 2, y - r - 2, x + r + 2, y + r + 2), fill=(*glow, 80))
    draw.ellipse((x - r, y - r, x + r, y + r), fill=color)


def draw_shell(base: Image.Image, cx: float, cy: float, outer_r: float, shell: dict) -> None:
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    pitch = (outer_r / CIRCLE_RADIUS) * 0.9
    ring_target = CIRCLE_RADIUS * 0.72

    for row in range(16):
        for col in range(16):
            dx = col - 7.5
            dy = row - 7.5
            dist = math.hypot(dx, dy)
            if dist > CIRCLE_RADIUS:
                continue
            x = cx + dx * pitch
            y = cy + dy * pitch
            if abs(dist - ring_target) < 0.85:
                color = shell["primary"]
                radius = 4
            else:
                idx = (row * 5 + col * 3) % len(shell["accents"])
                color = shell["accents"][idx]
                radius = 3
            draw_glow_dot(draw, x, y, color, radius)

    base.alpha_composite(overlay)


def generate_composite() -> Image.Image:
    if not BG.exists():
        raise SystemExit(f"Missing background: {BG}")
    img = Image.open(BG).convert("RGBA")
    img = img.resize((W, H), Image.Resampling.LANCZOS)
    outer_r = max_outer_radius() * 0.92
    for i, shell in enumerate(SHELLS):
        cx, cy = burst_xy(i)
        draw_shell(img, cx, cy, outer_r, shell)
    return img.convert("RGB")


def save(img: Image.Image) -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print("wrote", OUT, OUT.stat().st_size // 1024, "KB")


def main() -> None:
    parser = argparse.ArgumentParser(description="Import or generate flame fireworks tool thumbnail.")
    parser.add_argument(
        "source",
        nargs="?",
        help="Screenshot to use (cropped to 1200x675). Defaults to images/flame-fireworks-thumb-source.png if present.",
    )
    args = parser.parse_args()

    source = None
    if args.source:
        source = Path(args.source)
    elif DEFAULT_SOURCE.exists():
        source = DEFAULT_SOURCE

    if source:
        if not source.exists():
            print(f"Source not found: {source}", file=sys.stderr)
            sys.exit(1)
        save(import_source(source))
        return

    save(generate_composite())


if __name__ == "__main__":
    main()
