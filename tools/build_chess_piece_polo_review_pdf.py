from pathlib import Path

from PIL import Image
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(r"C:\Users\Tumelo\Documents\PCC Tournament Polo Catalogue")
PNG = ROOT / "03 Shirt Mockups" / "Version 2 Chess Pieces" / "PNG Exports"
OUTPUT = ROOT / "07 Exports" / "PCC Version 2 Chess Pieces Collection - Review Catalogue V2.pdf"
W, H = landscape(A3)
RED = HexColor("#d71920")
BLACK = HexColor("#08090a")
PANEL = HexColor("#111315")
GREY = HexColor("#aeb3b7")


def frame(pdf, title, subtitle, page_number):
    pdf.setFillColor(BLACK)
    pdf.rect(0, 0, W, H, fill=1, stroke=0)
    pdf.setFillColor(RED)
    pdf.rect(0, H - 12, W, 12, fill=1, stroke=0)
    pdf.setFillColor(white)
    pdf.setFont("Helvetica-Bold", 23)
    pdf.drawString(34, H - 45, title)
    pdf.setFillColor(GREY)
    pdf.setFont("Helvetica", 10)
    pdf.drawString(35, H - 62, subtitle)
    pdf.setStrokeColor(HexColor("#36393c"))
    pdf.line(34, H - 73, W - 34, H - 73)
    pdf.setFont("Helvetica", 8)
    pdf.drawString(34, 18, "POLOKWANE CHESS CLUB  |  TOURNAMENT POLO COLLECTION 2026")
    pdf.drawRightString(W - 34, 18, f"CHESS-PIECE COLLECTION  |  PAGE {page_number}")


def place(pdf, filename, x, y, width, height):
    image = Image.open(PNG / filename)
    scale = min(width / image.width, height / image.height)
    draw_width, draw_height = image.width * scale, image.height * scale
    pdf.drawImage(
        ImageReader(image),
        x + (width - draw_width) / 2,
        y + (height - draw_height) / 2,
        draw_width,
        draw_height,
        mask="auto",
    )


pdf = canvas.Canvas(str(OUTPUT), pagesize=(W, H))
margin, gap = 34, 16
frame(
    pdf,
    "CHESS-PIECE TOURNAMENT POLOS - BLACK / RED / WHITE",
    "Chess-piece hem artwork | coordinated front and back views | corrected POLOKWANE identity",
    1,
)
column = (W - 2 * margin - 2 * gap) / 3
for index, colour in enumerate(("black", "red", "white")):
    x = margin + index * (column + gap)
    pdf.setFillColor(PANEL)
    pdf.roundRect(x, 54, column, H - 137, 7, fill=1, stroke=0)
    pdf.setFillColor(RED)
    pdf.rect(x + 10, H - 116, 11, 27, fill=1, stroke=0)
    pdf.setFillColor(white)
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(x + 27, H - 106, f"{index + 1:02d}  {colour.upper()} EDITION")
    half = (column - 28) / 2
    place(pdf, f"V2-{colour}-front.png", x + 10, 85, half, H - 200)
    place(pdf, f"V2-{colour}-back.png", x + 18 + half, 85, half, H - 200)
    pdf.setFillColor(GREY)
    pdf.setFont("Helvetica-Bold", 8)
    pdf.drawCentredString(x + 10 + half / 2, 70, "FRONT")
    pdf.drawCentredString(x + 18 + half + half / 2, 70, "BACK")
pdf.showPage()

frame(
    pdf,
    "CHESS-PIECE LEADERSHIP POLOS",
    "Captain and manager variants | black and white editions",
    2,
)
entries = [
    ("CAPTAIN - BLACK", "V2-black-front-captain.png"),
    ("CAPTAIN - WHITE", "V2-white-front-captain.png"),
    ("MANAGER - BLACK", "V2-black-front-manager.png"),
    ("MANAGER - WHITE", "V2-white-front-manager.png"),
]
gap = 15
column = (W - 2 * margin - 3 * gap) / 4
for index, (title, filename) in enumerate(entries):
    x = margin + index * (column + gap)
    pdf.setFillColor(PANEL)
    pdf.roundRect(x, 54, column, H - 137, 7, fill=1, stroke=0)
    pdf.setFillColor(RED)
    pdf.rect(x + 10, H - 116, 11, 27, fill=1, stroke=0)
    pdf.setFillColor(white)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(x + 27, H - 106, title)
    place(pdf, filename, x + 10, 78, column - 20, H - 205)
pdf.save()
print(OUTPUT)
