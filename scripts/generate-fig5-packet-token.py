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
MARGIN_LEFT = 40
BOX_W, BOX_H, BOX_GAP = 88, 64, 18
LABEL_COL_W = 168
TITLE = "6바이트 = 6토큰 (길이 = 토큰 수 = 바이트 수)"


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


def draw_row(draw, y, label, values, box_color, start_x, font_label, font_byte, font_idx):
    draw.text((MARGIN_LEFT, y + 10), label, fill=MUTED, font=font_label)

    centers = []
    for i, val in enumerate(values):
        x = start_x + i * (BOX_W + BOX_GAP)
        draw.rounded_rectangle(
            (x, y + 6, x + BOX_W, y + 6 + BOX_H),
            radius=10,
            fill=box_color,
            outline=BORDER,
            width=2,
        )
        bbox = draw.textbbox((0, 0), val, font=font_byte)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((x + (BOX_W - tw) / 2, y + 6 + (BOX_H - th) / 2 - 2), val, fill=TEXT, font=font_byte)
        cx = x + BOX_W / 2
        centers.append(cx)
        idx = str(i)
        ib = draw.textbbox((0, 0), idx, font=font_idx)
        iw = ib[2] - ib[0]
        draw.text((cx - iw / 2, y + 6 + BOX_H + 10), idx, fill=MUTED, font=font_idx)

    last_box_right = start_x + (len(values) - 1) * (BOX_W + BOX_GAP) + BOX_W
    return centers, last_box_right


def main():
    font_label = load_font(24)
    font_byte = load_font(30, bold=True)
    font_idx = load_font(18)
    font_title = load_font(21, bold=True)

    start_x = MARGIN_LEFT + LABEL_COL_W
    content_right = start_x + len(BYTES) * (BOX_W + BOX_GAP) - BOX_GAP + BOX_W
    width = content_right + 24
    height = 318

    img = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(img)

    draw.text((MARGIN_LEFT, 18), TITLE, fill=CYAN, font=font_title)

    pkt_y = 62
    tok_y = 194

    pkt_centers, _ = draw_row(draw, pkt_y, "패킷 (hex)", BYTES, BOX, start_x, font_label, font_byte, font_idx)
    tok_centers, _ = draw_row(draw, tok_y, "토큰 (1:1)", BYTES, BOX_TOKEN, start_x, font_label, font_byte, font_idx)

    for pc, tc in zip(pkt_centers, tok_centers):
        top = pkt_y + 6 + BOX_H + 34
        bottom = tok_y + 6 - 8
        draw.line((pc, top, tc, bottom), fill=ACCENT, width=2)
        draw.polygon(
            [(tc - 6, bottom - 10), (tc + 6, bottom - 10), (tc, bottom)],
            fill=ACCENT,
        )

    bracket_y = pkt_y + 6 + BOX_H + 38
    bracket_right = start_x + (len(BYTES) - 1) * (BOX_W + BOX_GAP) + BOX_W
    draw.line((start_x, bracket_y, start_x, bracket_y + 14), fill=ACCENT, width=2)
    draw.line((start_x, bracket_y + 14, bracket_right, bracket_y + 14), fill=ACCENT, width=2)
    draw.line((bracket_right, bracket_y, bracket_right, bracket_y + 14), fill=ACCENT, width=2)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({width}x{height})")


if __name__ == "__main__":
    main()
