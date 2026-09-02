from pathlib import Path

from PIL import Image


ROOT = Path(r"C:\Users\Tumelo\pcc-website\public\images\store")
NAMES = [
    "pcc-white-polo-front.png",
    "pcc-white-polo-left.png",
    "pcc-white-polo-back-fixed.png",
    "pcc-white-polo-right.png",
]
CANVAS = (1400, 1600)
TARGET = (1220, 1460)


def normalize(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    box = image.getchannel("A").getbbox() or (0, 0, *image.size)
    image = image.crop(box)
    image.thumbnail(TARGET, Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    frame.alpha_composite(
        image,
        ((CANVAS[0] - image.width) // 2, (CANVAS[1] - image.height) // 2),
    )
    return frame


frames = [normalize(ROOT / name) for name in NAMES]
frames[0].save(
    ROOT / "pcc-white-polo-360.webp",
    save_all=True,
    append_images=frames[1:],
    duration=[1100] * len(frames),
    loop=0,
    lossless=True,
    method=6,
)

gif_frames = []
for frame in frames:
    background = Image.new("RGB", CANVAS, "white")
    background.paste(frame, mask=frame.getchannel("A"))
    gif_frames.append(
        background.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    )

gif_frames[0].save(
    ROOT / "pcc-white-polo-360.gif",
    save_all=True,
    append_images=gif_frames[1:],
    duration=[1100] * len(gif_frames),
    loop=0,
    optimize=True,
)
