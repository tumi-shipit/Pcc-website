from pathlib import Path

from PIL import Image


SOURCE_DIR = Path(r"C:\Users\Tumelo\pcc-website\tmp\imagegen\tracksuit-hoodie")
OUTPUT_DIR = SOURCE_DIR / "individual"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

for source in sorted(SOURCE_DIR.glob("*-transparent.png")):
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    stem = source.name.replace("-transparent.png", "")

    for view, bounds in (
        ("front", (0, 0, width // 2, height)),
        ("back", (width // 2, 0, width, height)),
    ):
        crop = image.crop(bounds)
        alpha = crop.getchannel("A")
        bbox = alpha.getbbox()
        if bbox:
            crop = crop.crop(bbox)

        padded = Image.new("RGBA", (crop.width + 80, crop.height + 80), (0, 0, 0, 0))
        padded.alpha_composite(crop, (40, 40))
        padded.save(OUTPUT_DIR / f"{stem}-{view}.png")

print(f"Created {len(list(OUTPUT_DIR.glob('*.png')))} transparent garment views.")

thumbs = []
for asset in sorted(OUTPUT_DIR.glob("*.png")):
    image = Image.open(asset).convert("RGBA")
    image.thumbnail((300, 360))
    tile = Image.new("RGBA", (320, 410), (22, 24, 26, 255))
    tile.alpha_composite(image, ((320 - image.width) // 2, 20))
    thumbs.append(tile)

sheet = Image.new("RGBA", (320 * 4, 410 * 3), (7, 8, 9, 255))
for index, tile in enumerate(thumbs):
    sheet.alpha_composite(tile, ((index % 4) * 320, (index // 4) * 410))
sheet.convert("RGB").save(SOURCE_DIR / "contact-sheet.jpg", quality=92)
