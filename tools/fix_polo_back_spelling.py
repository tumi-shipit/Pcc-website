from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageStat


ROOT = Path(r"C:\Users\Tumelo\Documents\PCC Tournament Polo Catalogue\03 Shirt Mockups")
OUTPUT = Path(r"C:\Users\Tumelo\pcc-website\tmp\polo-spelling-fixes")
OUTPUT.mkdir(parents=True, exist_ok=True)
FONT = Path(r"C:\Windows\Fonts\ARIALNB.TTF")

FILES = [
    ("collection-1", ROOT / "PNG Exports" / "PCC-black-back.png", "red"),
    ("collection-1", ROOT / "PNG Exports" / "PCC-red-back.png", "black"),
    ("collection-1", ROOT / "PNG Exports" / "PCC-white-back.png", "red"),
    ("collection-2", ROOT / "Version 2 Chess Pieces" / "PNG Exports" / "V2-black-back.png", "red"),
    ("collection-2", ROOT / "Version 2 Chess Pieces" / "PNG Exports" / "V2-red-back.png", "black"),
    ("collection-2", ROOT / "Version 2 Chess Pieces" / "PNG Exports" / "V2-white-back.png", "red"),
]


def fit_font(text: str, maximum_width: int, starting_size: int) -> ImageFont.FreeTypeFont:
    size = starting_size
    while size > 12:
        font = ImageFont.truetype(str(FONT), size)
        bounds = font.getbbox(text)
        if bounds[2] - bounds[0] <= maximum_width:
            return font
        size -= 1
    return ImageFont.truetype(str(FONT), 12)


def repair(source: Path, colour: str) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    width, height = image.size

    left = int(width * 0.255)
    right = int(width * 0.745)
    top = int(height * 0.222)
    bottom = int(height * 0.300)
    patch_width = right - left
    patch_height = bottom - top

    sample_top = int(height * 0.405)
    sample = image.crop((left, sample_top, right, sample_top + patch_height))

    surrounding = image.crop((left, max(0, top - 18), right, top))
    target_mean = ImageStat.Stat(surrounding.convert("RGB")).mean
    sample_mean = ImageStat.Stat(sample.convert("RGB")).mean
    channels = sample.split()
    adjusted = []
    for index, channel in enumerate(channels[:3]):
        offset = int(target_mean[index] - sample_mean[index])
        adjusted.append(channel.point(lambda value, delta=offset: max(0, min(255, value + delta))))
    sample = Image.merge("RGBA", (*adjusted, channels[3]))

    mask = Image.new("L", (patch_width, patch_height), 0)
    mask_draw = ImageDraw.Draw(mask)
    feather = max(12, int(height * 0.012))
    mask_draw.rounded_rectangle(
        (feather, feather // 2, patch_width - feather, patch_height - feather // 2),
        radius=feather,
        fill=255,
    )
    mask = mask.filter(ImageFilter.GaussianBlur(feather))
    image.alpha_composite(Image.composite(sample, image.crop((left, top, right, bottom)), mask), (left, top))

    draw = ImageDraw.Draw(image)
    font = fit_font("POLOKWANE", int(width * 0.39), int(height * 0.058))
    text_bbox = draw.textbbox((0, 0), "POLOKWANE", font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    x = (width - text_width) // 2
    y = int(height * 0.244) - text_height // 2
    fill = (230, 22, 30, 255) if colour == "red" else (15, 15, 15, 255)
    draw.text((x, y), "POLOKWANE", font=font, fill=fill)
    return image


for collection, source, colour in FILES:
    result = repair(source, colour)
    result.save(OUTPUT / f"{collection}-{source.name}")

thumbs = []
for path in sorted(OUTPUT.glob("collection-*.png")):
    image = Image.open(path).convert("RGBA")
    image.thumbnail((280, 360))
    tile = Image.new("RGBA", (300, 390), (30, 32, 34, 255))
    tile.alpha_composite(image, ((300 - image.width) // 2, 15))
    thumbs.append(tile)

sheet = Image.new("RGB", (900, 780), (10, 11, 12))
for index, tile in enumerate(thumbs):
    sheet.paste(tile.convert("RGB"), ((index % 3) * 300, (index // 3) * 390))
sheet.save(OUTPUT / "corrected-polo-backs-contact-sheet.jpg", quality=94)
print(f"Prepared {len(thumbs)} corrected polo backs in {OUTPUT}")
