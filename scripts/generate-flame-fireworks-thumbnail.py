"""Generate Interactive Tools card thumbnail with flame-test firework rings."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "images" / "interactive-tools-flame-fireworks-preview.png"
BG = ROOT / "public" / "tools" / "flame-test-fireworks" / "assets" / "backgrounds" / "city-skyline-2.png"

W, H = 1200, 675

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

# Ring highlight + accent dots (HKDSE flame colours)
SHELLS = [
    {"ring": "#FFD54F", "accents": ["#DC143C", "#26C6DA", "#CE93D8", "#FFFFFF"]},
    {"ring": "#CE93D8", "accents": ["#FFD54F", "#DC143C", "#26C6DA", "#FFFFFF"]},
    {"ring": "#DC143C", "accents": ["#FFD54F", "#26C6DA", "#CE93D8", "#FFFFFF"]},
    {"ring": "#26C6DA", "accents": ["#FFD54F", "#DC143C", "#CE93D8", "#FFFFFF"]},
    {"ring": "#FFFFFF", "accents": ["#FFD54F", "#DC143C", "#26C6DA", "#CE93D8"]},
]

CIRCLE_RADIUS_CELLS = 7
RING_DIST_FRAC = 0.72


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


def ring_points(cx: float, cy: float, outer_r: float, dist_frac: float) -> list[tuple[float, float]]:
    pitch = (outer_r / CIRCLE_RADIUS_CELLS) * 0.92
    target = CIRCLE_RADIUS_CELLS * dist_frac
    pts = []
    for row in range(16):
        for col in range(16):
            dx = col - 7.5
            dy = row - 7.5
            if math.hypot(dx, dy) > CIRCLE_RADIUS_CELLS:
                continue
            dist = math.hypot(dx, dy)
            if abs(dist - target) > 0.85:
                continue
            pts.append((cx + dx * pitch, cy + dy * pitch))
    return pts


def draw_glow_dot(draw: ImageDraw.ImageDraw, x: float, y: float, color: str, r: int = 4) -> None:
    rgb = tuple(int(color[i : i + 2], 16) for i in (1, 3, 5))
    glow = tuple(min(255, c + 40) for c in rgb)
    draw.ellipse((x - r - 2, y - r - 2, x + r + 2, y + r + 2), fill=(*glow, 70))
    draw.ellipse((x - r, y - r, x + r, y + r), fill=color)


def draw_shell(
    base: Image.Image,
    cx: float,
    cy: float,
    outer_r: float,
    shell: dict,
) -> None:
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    ring_pts = ring_points(cx, cy, outer_r, RING_DIST_FRAC)
    inner_pts = ring_points(cx, cy, outer_r * 0.78, RING_DIST_FRAC * 0.78)

    for i, (x, y) in enumerate(ring_pts):
        c = shell["ring"] if i % 5 else shell["accents"][i % len(shell["accents"])]
        draw_glow_dot(draw, x, y, c, 4)

    for i, (x, y) in enumerate(inner_pts):
        c = shell["accents"][i % len(shell["accents"])]
        draw_glow_dot(draw, x, y, c, 3)

    base.alpha_composite(overlay)


def main() -> None:
    if not BG.exists():
        raise SystemExit(f"Missing background: {BG}")

    img = Image.open(BG).convert("RGBA")
    img = img.resize((W, H), Image.Resampling.LANCZOS)
    outer_r = max_outer_radius() * 0.92

    for i, shell in enumerate(SHELLS):
        cx, cy = burst_xy(i)
        draw_shell(img, cx, cy, outer_r, shell)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(OUT, "PNG", optimize=True)
    print("wrote", OUT, OUT.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
