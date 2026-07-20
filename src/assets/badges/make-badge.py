#!/usr/bin/env python3
"""Generate dark/light tech badges matching SPEC.md"""
import sys, urllib.request, subprocess, tempfile, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
H, PAD_L, ICON, GAP, PAD_R = 28, 9, 14, 9, 13
TRACKING, WORD_GAP = 1, 7
FONT = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 11)
THEMES = {
    "dark": {"bg": (54, 59, 68, 255), "fg": (255, 255, 255, 255)},
    "light": {"bg": (232, 236, 240, 255), "fg": (36, 41, 47, 255)},
}

def usage():
    print("Usage: python make-badge.py <Label> <simpleicons-slug> <logoHex> [filename]")
    sys.exit(1)

def fetch_svg(slug, color_hex):
    url = f"https://cdn.simpleicons.org/{slug}/{color_hex}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=30).read()

def find_sharp_cwd():
    env = Path(__file__).resolve().parents
    candidates = []
    if "SHARP_CWD" in __import__("os").environ:
        candidates.append(Path(__import__("os").environ["SHARP_CWD"]))
    # .../Hyeonseok93.github.io/src/assets/badges -> repo root is parents[3]
    repo = HERE.parents[2]  # github.io root
    candidates.append(repo.parent / "long-screenshot-tool")
    candidates.append(Path.cwd())
    for c in candidates:
        if (c / "node_modules" / "sharp").exists() or (c / "package.json").exists():
            return str(c)
    return str(Path.cwd())

def svg_to_icon(svg_bytes, size=ICON):
    tmp_svg = Path(tempfile.gettempdir()) / "_badge_si.svg"
    tmp_png = Path(tempfile.gettempdir()) / "_badge_si.png"
    tmp_svg.write_bytes(svg_bytes)
    js = (
        "const sharp=require('sharp');const fs=require('fs');"
        f"sharp(fs.readFileSync({json.dumps(str(tmp_svg))}))"
        f".resize({size},{size},{{fit:'contain',background:{{r:0,g:0,b:0,alpha:0}}}})"
        f".png().toFile({json.dumps(str(tmp_png))})"
        ".then(()=>console.log('ok')).catch(e=>{console.error(e);process.exit(1)})"
    )
    subprocess.check_call(["node", "-e", js], cwd=find_sharp_cwd())
    return Image.open(tmp_png).convert("RGBA")

def text_width(text):
    total = 0
    for i, ch in enumerate(text):
        if ch == " ":
            total += WORD_GAP
            continue
        b = FONT.getbbox(ch)
        total += b[2] - b[0]
        if i < len(text) - 1 and text[i + 1] != " " and ch != " ":
            total += TRACKING
    return total

def draw_text(img, text, x, y, fg):
    d = ImageDraw.Draw(img)
    cx = x
    for i, ch in enumerate(text):
        if ch == " ":
            cx += WORD_GAP
            continue
        d.text((cx, y), ch, font=FONT, fill=fg)
        b = FONT.getbbox(ch)
        cx += b[2] - b[0]
        if i < len(text) - 1 and text[i + 1] != " ":
            cx += TRACKING

def main():
    if len(sys.argv) < 4:
        usage()
    label, slug, logo_hex = sys.argv[1], sys.argv[2], sys.argv[3].lstrip("#")
    filename = sys.argv[4] if len(sys.argv) > 4 else "".join(ch for ch in label.lower() if ch.isalnum())
    icon = svg_to_icon(fetch_svg(slug, logo_hex), ICON)
    text = label.upper()
    W = PAD_L + ICON + GAP + text_width(text) + PAD_R
    ascent = FONT.getbbox("H")
    ty = (H - (ascent[3] - ascent[1])) // 2 - ascent[1]
    for theme, colors in THEMES.items():
        img = Image.new("RGBA", (W, H), colors["bg"])
        img.paste(icon, (PAD_L, (H - ICON) // 2), icon)
        draw_text(img, text, PAD_L + ICON + GAP, ty, colors["fg"])
        dest = HERE / theme / f"{filename}.png"
        dest.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest)
        print(f"wrote {dest} ({img.size[0]}x{img.size[1]})")

if __name__ == "__main__":
    main()