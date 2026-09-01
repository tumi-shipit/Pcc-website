from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageStat


ROOT = Path(r"C:\Users\Tumelo\pcc-website\tmp\polo-solid-trims")
FONT_PATH = Path(r"C:\Windows\Fonts\ARIALNB.TTF")


def fitted_font(maximum_width: int, starting_size: int):
    for size in range(starting_size, 11, -1):
        font = ImageFont.truetype(str(FONT_PATH), size)
        bounds = font.getbbox("POLOKWANE")
        if bounds[2] - bounds[0] <= maximum_width:
            return font
    return ImageFont.truetype(str(FONT_PATH), 12)


def correct_back(path: Path, text_colour: tuple[int, int, int, int]) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    left, right = int(width * 0.255), int(width * 0.745)
    top, bottom = int(height * 0.222), int(height * 0.300)
    patch_width, patch_height = right - left, bottom - top

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
    feather = max(12, int(height * 0.012))
    ImageDraw.Draw(mask).rounded_rectangle(
        (feather, feather // 2, patch_width - feather, patch_height - feather // 2),
        radius=feather,
        fill=255,
    )
    mask = mask.filter(ImageFilter.GaussianBlur(feather))
    replacement = Image.composite(sample, image.crop((left, top, right, bottom)), mask)
    image.alpha_composite(replacement, (left, top))

    draw = ImageDraw.Draw(image)
    font = fitted_font(int(width * 0.39), int(height * 0.058))
    bounds = draw.textbbox((0, 0), "POLOKWANE", font=font)
    text_width = bounds[2] - bounds[0]
    text_height = bounds[3] - bounds[1]
    draw.text(
        ((width - text_width) // 2, int(height * 0.244) - text_height // 2),
        "POLOKWANE",
        font=font,
        fill=text_colour,
    )
    return image


finals = {
    "PCC-black-front.png": Image.open(ROOT / "black-front-transparent.png").convert("RGBA"),
    "PCC-black-back.png": correct_back(ROOT / "black-back-transparent.png", (230, 22, 30, 255)),
    "PCC-red-front.png": Image.open(ROOT / "red-front-transparent.png").convert("RGBA"),
    "PCC-red-back.png": correct_back(ROOT / "red-back-transparent.png", (15, 15, 15, 255)),
    "PCC-white-front.png": Image.open(ROOT / "white-front-transparent.png").convert("RGBA"),
    "PCC-white-back.png": correct_back(ROOT / "white-back-transparent.png", (225, 20, 30, 255)),
}

for filename, image in finals.items():
    image.save(ROOT / filename)

tiles = []
for filename in sorted(finals):
    image = finals[filename].copy()
    image.thumbnail((360, 380))
    tile = Image.new("RGBA", (390, 410), (28, 30, 32, 255))
    tile.alpha_composite(image, ((390 - image.width) // 2, 15))
    tiles.append(tile)

sheet = Image.new("RGB", (1170, 820), (8, 9, 10))
for index, tile in enumerate(tiles):
    sheet.paste(tile.convert("RGB"), ((index % 3) * 390, (index // 3) * 410))
sheet.save(ROOT / "solid-trim-polo-contact-sheet.jpg", quality=94)
print("Prepared six final solid-trim tournament polo PNGs.")
