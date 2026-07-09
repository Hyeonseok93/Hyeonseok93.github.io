"""Generate fig5: 1 byte = 1 token mapping diagram (matches fig4 dark style)."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "content/posts/papers/roberta-quadrant-mapping-ics/fig5.png"

BG = "#12151c"
BOX = "#2a3140"
BOX_TOKEN = "#243041"
BORDER = "#4b5563"
TEXT = "#f3f4f6"
MUTED = "#9ca3af"
ACCENT = "#f97316"
CYAN = "#22d3ee"

BYTES = ["01", "03", "00", "00", "00", "01"]
W, H = 1280, 360


def load_font(size: int, bold: bool = False):
    candidates = [
        "C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf",
        "C:/Windows/Fonts/consola.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_row(draw, y, label, values, box_color, font_label, font_byte, font_idx):
    draw.text((56, y), label, fill=MUTED, font=font_label)

    box_w, box_h, gap = 88, 64, 18
    start_x = 220
    centers = []

    for i, val in enumerate(values):
        x = start_x + i * (box_w + gap)
        draw.rounded_rectangle(
            (x, y + 6, x + box_w, y + 6 + box_h),
            radius=10,
            fill=box_color,
            outline=BORDER,
            width=2,
        )
        bbox = draw.textbbox((0, 0), val, font=font_byte)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((x + (box_w - tw) / 2, y + 6 + (box_h - th) / 2 - 2), val, fill=TEXT, font=font_byte)
        cx = x + box_w / 2
        centers.append(cx)
        idx = str(i)
        ib = draw.textbbox((0, 0), idx, font=font_idx)
        iw = ib[2] - ib[0]
        draw.text((cx - iw / 2, y + 6 + box_h + 10), idx, fill=MUTED, font=font_idx)

    return centers, start_x, box_w, gap


def main():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    font_label = load_font(24)
    font_byte = load_font(30, bold=True)
    font_idx = load_font(18)
    font_note = load_font(22, bold=True)
    font_title = load_font(20, bold=True)

    draw.text((56, 28), "길이 = 토큰 수 = 바이트 수", fill=CYAN, font=font_title)

    pkt_y = 78
    tok_y = 210

    pkt_centers, start_x, box_w, gap = draw_row(
        draw, pkt_y, "패킷 (hex)", BYTES, BOX, font_label, font_byte, font_idx
    )
    tok_centers, _, _, _ = draw_row(
        draw, tok_y, "토큰 (1:1)", BYTES, BOX_TOKEN, font_label, font_byte, font_idx
    )

    for pc, tc in zip(pkt_centers, tok_centers):
        top = pkt_y + 6 + 64 + 34
        bottom = tok_y + 6 - 8
        draw.line((pc, top, tc, bottom), fill=ACCENT, width=2)
        draw.polygon(
            [(tc - 6, bottom - 10), (tc + 6, bottom - 10), (tc, bottom)],
            fill=ACCENT,
        )

    end_x = start_x + len(BYTES) * (box_w + gap) - gap
    bracket_y = pkt_y + 6 + 64 + 38
    draw.line((start_x, bracket_y, start_x, bracket_y + 16), fill=ACCENT, width=2)
    draw.line((start_x, bracket_y + 16, end_x, bracket_y + 16), fill=ACCENT, width=2)
    draw.line((end_x, bracket_y, end_x, bracket_y + 16), fill=ACCENT, width=2)

    note = "6바이트 = 6토큰 (길이 = 토큰 수 = 바이트 수)"
    nb = draw.textbbox((0, 0), note, font=font_note)
    nw = nb[2] - nb[0]
    draw.text(((start_x + end_x - nw) / 2, bracket_y + 24), note, fill=ACCENT, font=font_note)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
