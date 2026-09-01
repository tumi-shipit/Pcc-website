from pathlib import Path

from PIL import Image
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(r"C:\Users\Tumelo\Documents\PCC Tournament Polo Catalogue")
PNG = ROOT / "03 Shirt Mockups" / "Collection 3 Tracksuit Jacket and Hoodie" / "PNG Exports"
OUTPUT = ROOT / "07 Exports" / "PCC Tracksuit Jacket and Hoodie Collection 2026 - Review Catalogue.pdf"
W, H = landscape(A3)
RED = HexColor("#d71920")
BLACK = HexColor("#08090a")
PANEL = HexColor("#111315")
GREY = HexColor("#aeb3b7")


def background(pdf, title, subtitle, page_number):
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
    pdf.drawString(34, 18, "POLOKWANE CHESS CLUB  |  PREMIUM APPAREL COLLECTION 2026")
    pdf.drawRightString(W - 34, 18, f"JACKET & HOODIE  |  PAGE {page_number}")


def place(pdf, filename, x, y, width, height):
    image = Image.open(PNG / filename)
    scale = min(width / image.width, height / image.height)
    draw_width = image.width * scale
    draw_height = image.height * scale
    pdf.drawImage(
        ImageReader(image),
        x + (width - draw_width) / 2,
        y + (height - draw_height) / 2,
        draw_width,
        draw_height,
        mask="auto",
    )


def collection_page(pdf, garment, page_number):
    background(
        pdf,
        f"{garment.upper()} COLLECTION - BLACK / RED / WHITE",
        "Checkerboard lower panel | PCC identity | corrected front and back production views",
        page_number,
    )
    margin = 34
    gap = 16
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
        place(pdf, f"{garment}-{colour}-front.png", x + 10, 85, half, H - 200)
        place(pdf, f"{garment}-{colour}-back.png", x + 18 + half, 85, half, H - 200)
        pdf.setFillColor(GREY)
        pdf.setFont("Helvetica-Bold", 8)
        pdf.drawCentredString(x + 10 + half / 2, 70, "FRONT")
        pdf.drawCentredString(x + 18 + half + half / 2, 70, "BACK")
    pdf.showPage()


pdf = canvas.Canvas(str(OUTPUT), pagesize=(W, H))
collection_page(pdf, "jacket", 1)
collection_page(pdf, "hoodie", 2)
pdf.save()
print(OUTPUT)
