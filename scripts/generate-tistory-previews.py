"""Generate Tistory skin preview images.

- preview.gif (112x84) from src/assets/greeting.gif (animated)
- preview256/560/1600.jpg from src/assets/profile.png
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[1]
PROFILE_PATH = PROJECT_ROOT / "src" / "assets" / "profile.png"
GREETING_PATH = PROJECT_ROOT / "src" / "assets" / "greeting.gif"
OUTPUT_DIR = PROJECT_ROOT / "skin"

GIF_PREVIEW = ("preview.gif", 112, 84)
JPEG_PREVIEWS = (
    ("preview256.jpg", 256, 192),
    ("preview560.jpg", 560, 420),
    ("preview1600.jpg", 1600, 1200),
)


def resize_cover(image: Image.Image, width: int, height: int) -> Image.Image:
    source = image.convert("RGBA")
    src_w, src_h = source.size
    target_ratio = width / height
    src_ratio = src_w / src_h

    if src_ratio > target_ratio:
        resized_h = height
        resized_w = round(src_w * (height / src_h))
    else:
        resized_w = width
        resized_h = round(src_h * (width / src_w))

    resized = source.resize((resized_w, resized_h), Image.Resampling.LANCZOS)
    left = (resized_w - width) // 2
    top = (resized_h - height) // 2
    return resized.crop((left, top, left + width, top + height))


def save_jpeg_preview(image: Image.Image, path: Path) -> None:
    image.convert("RGB").save(path, format="JPEG", quality=88, optimize=True)


def save_gif_from_greeting(source_path: Path, dest_path: Path, width: int, height: int) -> None:
    with Image.open(source_path) as source:
        frames: list[Image.Image] = []
        durations: list[int] = []

        for frame_index in range(getattr(source, "n_frames", 1)):
            source.seek(frame_index)
            frame = resize_cover(source, width, height).convert("RGB")
            frames.append(frame)
            durations.append(source.info.get("duration", 100) or 100)

    if not frames:
        raise ValueError(f"No frames found in {source_path}")

    frames[0].save(
        dest_path,
        format="GIF",
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=True,
        disposal=2,
    )


def main() -> None:
    if not GREETING_PATH.exists():
        raise SystemExit(f"Greeting GIF not found: {GREETING_PATH}")
    if not PROFILE_PATH.exists():
        raise SystemExit(f"Profile image not found: {PROFILE_PATH}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    gif_name, gif_w, gif_h = GIF_PREVIEW
    gif_output = OUTPUT_DIR / gif_name
    save_gif_from_greeting(GREETING_PATH, gif_output, gif_w, gif_h)
    print(f"Wrote {gif_output.relative_to(PROJECT_ROOT)} ({gif_w}x{gif_h}) from greeting.gif")

    profile = Image.open(PROFILE_PATH)
    for filename, width, height in JPEG_PREVIEWS:
        output = OUTPUT_DIR / filename
        preview = resize_cover(profile, width, height)
        save_jpeg_preview(preview, output)
        print(f"Wrote {output.relative_to(PROJECT_ROOT)} ({width}x{height}) from profile.png")


if __name__ == "__main__":
    main()
