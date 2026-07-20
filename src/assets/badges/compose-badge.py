"""Compose README tech badges by reusing letter glyphs from existing inventory badges.

Do not use shields.io or fresh font rendering — both diverge from the inventory look.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import urllib.request
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image

BLOG = Path(__file__).resolve().parent
MACTA = Path(r"C:\Users\hyunm\WorkStation\github\SK-Rookies5-MINI3_MACTA\assets\readme\badges")
SHARP_CWD = Path(r"C:\Users\hyunm\WorkStation\github\long-screenshot-tool")

H = 28
PAD_L = 9
ICON = 14
# Offset after icon box before first letter ink (docker ink starts ~10 after icon).
ICON_TO_INK = 10
# Empty columns between letter ink (docker/typescript = 3).
INK_GAP = 3
# Word gap in ink columns (springsecurity ≈ 8); calibrated at runtime.
WORD_INK_GAP = 8
# Empty columns after last letter ink (docker = 14).
PAD_R = 14

DARK_BG = (54, 59, 68, 255)
DARK_BG_RGB = np.array([54, 59, 68], dtype=np.int16)
LIGHT_BG = np.array([232, 236, 240], dtype=np.int16)
LIGHT_FG = np.array([36, 41, 47], dtype=np.int16)

SOURCES = {
    "docker": "DOCKER",
    "terraform": "TERRAFORM",
    "springsecurity": "SPRING SECURITY",
    "githubactions": "GITHUB ACTIONS",
    "typescript": "TYPESCRIPT",
    "springboot": "SPRING BOOT",
    "react": "REACT",
    "java": "JAVA",
    "maven": "MAVEN",
    "zustand": "ZUSTAND",
    "axios": "AXIOS",
    "jwt": "JWT",
    "redis": "REDIS",
    "mariadb": "MARIADB",
    "hibernate": "HIBERNATE",
    "vite": "VITE",
    "zod": "ZOD",
    "reactrouter": "REACT ROUTER",
    "tailwindcss": "TAILWIND CSS",
    "tanstackquery": "TANSTACK QUERY",
    "reacthookform": "REACT HOOK FORM",
}

PREFER_SRC = {
    "docker",
    "terraform",
    "springsecurity",
    "githubactions",
    "typescript",
    "springboot",
    "react",
    "java",
    "maven",
    "jwt",
    "redis",
    "axios",
    "zustand",
    "vite",
    "zod",
    "hibernate",
    "mariadb",
    "reactrouter",
    "tailwindcss",
}


def runs_of(mask: np.ndarray) -> list[tuple[int, int]]:
    runs: list[tuple[int, int]] = []
    on = False
    start = 0
    for i, v in enumerate(mask):
        if v and not on:
            start = i
            on = True
        elif not v and on:
            runs.append((start, i - 1))
            on = False
    if on:
        runs.append((start, len(mask) - 1))
    return runs


def ink_mask(a: np.ndarray) -> np.ndarray:
    return (a[:, :, 0] > 180) & (a[:, :, 1] > 180) & (a[:, :, 2] > 180) & (a[:, :, 3] > 80)


def glyph_density(crop: Image.Image) -> float:
    a = np.array(crop)
    white = (a[:, :, 0] > 180) & (a[:, :, 1] > 180) & (a[:, :, 2] > 180)
    return float(white.sum()) / float(max(1, crop.width * crop.height))


def build_bank() -> dict[str, list[dict]]:
    root = BLOG / "dark"
    bank: dict[str, list[dict]] = defaultdict(list)
    for name, label in SOURCES.items():
        path = root / f"{name}.png"
        if not path.exists():
            continue
        im = Image.open(path).convert("RGBA")
        a = np.array(im)
        bg = a[0, 0]
        content = np.any(a != bg, axis=2).any(0)
        col_runs = runs_of(content)[1:]  # drop icon
        letters = [c for c in label if c != " "]
        if len(col_runs) != len(letters):
            continue
        for (s, e), ch in zip(col_runs, letters):
            crop = im.crop((s, 0, e + 1, H))
            ca = np.array(crop)
            white = ink_mask(ca)
            ic = np.where(white.any(0))[0]
            if len(ic) == 0:
                continue
            bank[ch].append(
                {
                    "img": crop,
                    "w": e - s + 1,
                    "src": name,
                    "density": glyph_density(crop),
                    "ink_left": int(ic[0]),
                    "ink_right": int(ic[-1]),
                }
            )
    return bank


def pick(bank: dict[str, list[dict]], ch: str) -> dict:
    if ch not in bank or not bank[ch]:
        raise KeyError(f"No glyph for {ch!r}")
    # Denser glyphs from core inventory → stroke weight closer to DOCKER/TERRAFORM.
    candidates = [g for g in bank[ch] if g["src"] in PREFER_SRC] or bank[ch]
    return max(candidates, key=lambda g: g["density"])


def fetch_icon(slug: str, hexcolor: str) -> Image.Image:
    req = urllib.request.Request(
        f"https://cdn.simpleicons.org/{slug}/{hexcolor}",
        headers={"User-Agent": "Mozilla/5.0"},
    )
    svg = urllib.request.urlopen(req, timeout=30).read()
    tmp_svg = Path(tempfile.gettempdir()) / "_badge_icon.svg"
    tmp_png = Path(tempfile.gettempdir()) / "_badge_icon.png"
    tmp_svg.write_bytes(svg)
    js = (
        "const sharp=require('sharp');const fs=require('fs');"
        f"sharp(fs.readFileSync({json.dumps(str(tmp_svg))}))"
        f".resize({ICON},{ICON},{{fit:'contain',background:{{r:0,g:0,b:0,alpha:0}}}})"
        f".png().toFile({json.dumps(str(tmp_png))})"
        ".then(()=>console.log('ok')).catch(e=>{console.error(e);process.exit(1)})"
    )
    subprocess.check_call(["node", "-e", js], cwd=str(SHARP_CWD))
    icon = Image.open(tmp_png).convert("RGBA")
    # Force exact ICON×ICON canvas (sharp contain can yield 12–13 wide icons).
    canvas = Image.new("RGBA", (ICON, ICON), (0, 0, 0, 0))
    ox = (ICON - icon.width) // 2
    oy = (ICON - icon.height) // 2
    canvas.paste(icon, (ox, oy), icon)
    return canvas


def to_light(dark_img: Image.Image) -> Image.Image:
    """Recolor dark badge → light. Map ALL grayscale text/AA (not only bright cores).

    Chromatic icon pixels are kept. Coverage matches inventory docker dark↔light.
    """
    a = np.array(dark_img).astype(np.int16)
    rgb = a[:, :, :3]
    dist = np.abs(rgb - DARK_BG_RGB).sum(2)
    is_bg = dist < 30
    chroma = (
        np.abs(rgb[:, :, 0] - rgb[:, :, 1])
        + np.abs(rgb[:, :, 1] - rgb[:, :, 2])
        + np.abs(rgb[:, :, 0] - rgb[:, :, 2])
    )
    is_icon = (~is_bg) & (chroma >= 25)
    is_text = (~is_bg) & (~is_icon)

    out = a.copy()
    out[is_bg, :3] = LIGHT_BG
    out[is_bg, 3] = 255

    bg_mean = float(DARK_BG_RGB.mean())
    ys, xs = np.where(is_text)
    for y, x in zip(ys, xs):
        lum = float(rgb[y, x].mean())
        cov = max(0.0, min(1.0, (lum - bg_mean) / (255.0 - bg_mean)))
        out[y, x, :3] = (LIGHT_BG * (1.0 - cov) + LIGHT_FG * cov).astype(np.int16)
        out[y, x, 3] = 255
    # icons already in `out` from copy
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def compose(label: str, icon: Image.Image, filename: str, bank: dict[str, list[dict]]) -> Image.Image:
    glyphs: list[dict | None] = []
    for ch in label.upper():
        if ch == " ":
            glyphs.append(None)
        else:
            g = pick(bank, ch)
            glyphs.append(g)
            print(f"  {ch} <- {g['src']} dens={g['density']:.3f} w={g['w']}")

    # Place by ink so letter spacing matches DOCKER (ink gap = 3).
    placements: list[tuple[dict, int] | None] = []
    ink_cursor = PAD_L + ICON + ICON_TO_INK
    last_ink_right = ink_cursor - 1
    for i, g in enumerate(glyphs):
        if g is None:
            ink_cursor = last_ink_right + 1 + WORD_INK_GAP
            placements.append(None)
            continue
        place_x = ink_cursor - g["ink_left"]
        placements.append((g, place_x))
        last_ink_right = place_x + g["ink_right"]
        if i + 1 < len(glyphs) and glyphs[i + 1] is not None:
            ink_cursor = last_ink_right + 1 + INK_GAP
        elif i + 1 < len(glyphs) and glyphs[i + 1] is None:
            ink_cursor = last_ink_right + 1  # WORD_INK_GAP applied on None
        else:
            ink_cursor = last_ink_right + 1

    W = last_ink_right + 1 + PAD_R
    img = Image.new("RGBA", (W, H), DARK_BG)
    img.paste(icon, (PAD_L, (H - ICON) // 2), icon)
    for item in placements:
        if item is None:
            continue
        g, place_x = item
        img.paste(g["img"], (place_x, 0), g["img"])

    for root in (BLOG, MACTA):
        dark_dir = root / "dark"
        light_dir = root / "light"
        dark_dir.mkdir(parents=True, exist_ok=True)
        light_dir.mkdir(parents=True, exist_ok=True)
        img.save(dark_dir / f"{filename}.png")
        to_light(img).save(light_dir / f"{filename}.png")
        print(f"wrote {root.name}/{{dark,light}}/{filename}.png {img.size}")
    return img


def analyze(path: Path) -> None:
    a = np.array(Image.open(path).convert("RGBA"))
    bg = a[0, 0]
    content = np.any(a != bg, axis=2).any(0)
    cr = runs_of(content)
    white = ink_mask(a)
    wr = runs_of(white.any(0))
    cg = [cr[i + 1][0] - cr[i][1] - 1 for i in range(len(cr) - 1)]
    # drop icon→first-letter from letter gap list for display
    letter_cg = cg[1:] if len(cg) > 1 else cg
    ig = [wr[i + 1][0] - wr[i][1] - 1 for i in range(len(wr) - 1)]
    print(
        path.name,
        "W",
        a.shape[1],
        "icon->content",
        cr[1][0] - cr[0][1] - 1 if len(cr) > 1 else None,
        "right",
        a.shape[1] - 1 - cr[-1][1],
        "contentGaps",
        letter_cg,
        "inkGaps",
        ig,
        "inkMean",
        round(sum(ig) / len(ig), 2) if ig else None,
    )


def main() -> None:
    global WORD_INK_GAP
    ss = BLOG / "dark" / "springsecurity.png"
    if ss.exists():
        a = np.array(Image.open(ss).convert("RGBA"))
        white = ink_mask(a)
        wr = runs_of(white.any(0))
        # SPRING SECURITY → word break after 6 letters
        if len(wr) >= 7:
            WORD_INK_GAP = wr[6][0] - wr[5][1] - 1
            print("WORD_INK_GAP from springsecurity:", WORD_INK_GAP)

    bank = build_bank()
    missing = [c for c in "KUBERNETESARGOCD" if c not in bank]
    if missing:
        print("missing glyphs:", sorted(set(missing)))
        sys.exit(1)
    compose("KUBERNETES", fetch_icon("kubernetes", "326CE5"), "kubernetes", bank)
    compose("ARGO CD", fetch_icon("argo", "EF7B4D"), "argocd", bank)
    print("---")
    for n in ["docker", "terraform", "springsecurity", "kubernetes", "argocd"]:
        analyze(BLOG / "dark" / f"{n}.png")


if __name__ == "__main__":
    main()
