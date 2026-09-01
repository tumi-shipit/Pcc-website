from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageOps


ROOT = Path(r"C:\Users\Tumelo\pcc-website\tmp\layered-masters")
OUT = ROOT / "assets"
OUT.mkdir(parents=True, exist_ok=True)


def tight_half(source: Image.Image, side: str) -> Image.Image:
    width, height = source.size
    bounds = (0, 0, width // 2, height) if side == "front" else (width // 2, 0, width, height)
    crop = source.crop(bounds)
    bbox = crop.getchannel("A").getbbox()
    crop = crop.crop(bbox)
    canvas = Image.new("RGBA", (crop.width + 100, crop.height + 100), (0, 0, 0, 0))
    canvas.alpha_composite(crop, (50, 50))
    return canvas


def recolor(base: Image.Image, low: tuple[int, int, int], high: tuple[int, int, int]) -> Image.Image:
    alpha = base.getchannel("A")
    grey = ImageOps.grayscale(base)
    grey = ImageEnhance.Contrast(grey).enhance(1.15)
    colored = ImageOps.colorize(grey, low, high).convert("RGBA")
    colored.putalpha(alpha)
    return colored


def checker(base: Image.Image) -> Image.Image:
    alpha = base.getchannel("A")
    bbox = alpha.getbbox()
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    left, top, right, bottom = bbox
    start_y = int(top + (bottom - top) * 0.68)
    torso_left = int(left + (right - left) * 0.23)
    torso_right = int(right - (right - left) * 0.23)
    end_y = int(top + (bottom - top) * 0.88)
    cell = max(22, (torso_right - torso_left) // 9)
    for row, y in enumerate(range(start_y, end_y, cell)):
        for col, x in enumerate(range(torso_left, torso_right, cell)):
            shade = 255 if (row + col) % 2 else 0
            draw.rectangle((x, y, min(x + cell, torso_right), min(y + cell, end_y)), fill=(shade, shade, shade, 20))
    overlay.putalpha(Image.composite(overlay.getchannel("A"), Image.new("L", base.size, 0), alpha))
    return overlay


for garment in ("jacket", "hoodie"):
    source = Image.open(ROOT / f"{garment}-blank-transparent.png").convert("RGBA")
    for view in ("front", "back"):
        black = tight_half(source, view)
        black.save(OUT / f"{garment}-{view}-base-black.png")
        recolor(black, (190, 0, 0), (255, 58, 58)).save(OUT / f"{garment}-{view}-base-red.png")
        recolor(black, (185, 185, 185), (255, 255, 255)).save(OUT / f"{garment}-{view}-base-white.png")
        checker(black).save(OUT / f"{garment}-{view}-checkerboard.png")


flag = Image.new("RGBA", (240, 150), (0, 0, 0, 0))
d = ImageDraw.Draw(flag)
d.rectangle((0, 0, 240, 75), fill="#de3831")
d.rectangle((0, 75, 240, 150), fill="#244b8f")
d.polygon([(0, 0), (105, 75), (0, 150)], fill="#111111")
d.polygon([(0, 18), (80, 75), (0, 132), (0, 150), (108, 75), (0, 0)], fill="#f4c542")
d.polygon([(0, 32), (62, 75), (0, 118), (0, 138), (90, 75), (0, 12)], fill="#18864b")
d.polygon([(62, 59), (240, 59), (240, 91), (62, 91), (40, 75)], fill="#ffffff")
d.polygon([(65, 66), (240, 66), (240, 84), (65, 84), (53, 75)], fill="#18864b")
flag.save(OUT / "south-african-flag.png")

logo = Image.open(
    Path(r"C:\Users\Tumelo\Documents\PCC Tournament Polo Catalogue\02 Logos\PCC-Logo-White.png")
).convert("RGBA")
piece = logo.crop((40, 70, 225, 415))
piece_alpha = piece.getchannel("A")
piece_red = Image.new("RGBA", piece.size, (225, 20, 30, 0))
piece_red.putalpha(piece_alpha)
piece_red.save(OUT / "chess-piece-red.png")

print(f"Prepared {len(list(OUT.glob('*.png')))} layered-master assets.")
