from pathlib import Path

from PIL import Image
from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(r"C:\Users\Tumelo\Documents\PCC Tournament Polo Catalogue")
EXPORTS = ROOT / "07 Exports"
INTRO = Path(r"C:\Users\Tumelo\pcc-website\tmp\pdfs\pcc-complete-catalogue-intro.pdf")
OUTPUT = EXPORTS / "PCC Complete Apparel Catalogue 2026.pdf"
LOGO = ROOT / "02 Logos" / "PCC-Logo-White.png"
W, H = landscape(A3)
RED = HexColor("#d71920")
BLACK = HexColor("#070809")
PANEL = HexColor("#121416")
GREY = HexColor("#b6babd")


INTRO.parent.mkdir(parents=True, exist_ok=True)
pdf = canvas.Canvas(str(INTRO), pagesize=(W, H))

# Cover
pdf.setFillColor(BLACK)
pdf.rect(0, 0, W, H, fill=1, stroke=0)
pdf.setFillColor(RED)
pdf.rect(0, H - 14, W, 14, fill=1, stroke=0)

logo = Image.open(LOGO)
logo_scale = min(255 / logo.width, 255 / logo.height)
logo_width, logo_height = logo.width * logo_scale, logo.height * logo_scale
pdf.drawImage(
    ImageReader(logo),
    70,
    H - 80 - logo_height,
    logo_width,
    logo_height,
    mask="auto",
)

pdf.setFillColor(white)
pdf.setFont("Helvetica-Bold", 42)
pdf.drawString(365, H - 145, "COMPLETE APPAREL")
pdf.drawString(365, H - 195, "CATALOGUE 2026")
pdf.setFillColor(RED)
pdf.setFont("Helvetica-Bold", 20)
pdf.drawString(368, H - 230, "POLOKWANE CHESS CLUB")
pdf.setFillColor(GREY)
pdf.setFont("Helvetica", 14)
pdf.drawString(368, H - 262, "Tournament polos  |  Leadership polos  |  Jackets  |  Hoodies")

pdf.setStrokeColor(HexColor("#35383b"))
pdf.line(70, 150, W - 70, 150)
pdf.setFillColor(white)
pdf.setFont("Helvetica-Bold", 18)
pdf.drawString(70, 112, "ONE CLUB. ONE FAMILY. ONE PURPOSE.")
pdf.setFillColor(GREY)
pdf.setFont("Helvetica", 10)
pdf.drawRightString(W - 70, 112, "DESIGN REVIEW AND SUPPLIER PRESENTATION CATALOGUE")
pdf.showPage()

# Contents
pdf.setFillColor(BLACK)
pdf.rect(0, 0, W, H, fill=1, stroke=0)
pdf.setFillColor(RED)
pdf.rect(0, H - 12, W, 12, fill=1, stroke=0)
pdf.setFillColor(white)
pdf.setFont("Helvetica-Bold", 28)
pdf.drawString(55, H - 58, "CATALOGUE CONTENTS")
pdf.setFillColor(GREY)
pdf.setFont("Helvetica", 11)
pdf.drawString(56, H - 80, "Three independent apparel collections presented together in one catalogue")

cards = [
    (
        "01",
        "CHECKERBOARD TOURNAMENT POLOS",
        "Black, red and white editions; solid collars and cuffs; captain and manager variants.",
        "Pages 3-4",
    ),
    (
        "02",
        "CHESS-PIECE TOURNAMENT POLOS",
        "Black, red and white editions with chess-piece hem artwork and leadership variants.",
        "Pages 5-6",
    ),
    (
        "03",
        "TRACKSUIT JACKETS AND HOODIES",
        "Black, red and white jackets and hoodies with coordinated PCC branding.",
        "Pages 7-8",
    ),
]

margin, gap = 55, 18
card_width = (W - 2 * margin - 2 * gap) / 3
for index, (number, title, description, pages) in enumerate(cards):
    x = margin + index * (card_width + gap)
    y = 195
    pdf.setFillColor(PANEL)
    pdf.roundRect(x, y, card_width, 420, 8, fill=1, stroke=0)
    pdf.setFillColor(RED)
    pdf.setFont("Helvetica-Bold", 42)
    pdf.drawString(x + 24, y + 340, number)
    pdf.setFillColor(white)
    pdf.setFont("Helvetica-Bold", 15)
    words = title.split()
    lines = []
    line = ""
    for word in words:
        trial = (line + " " + word).strip()
        if pdf.stringWidth(trial, "Helvetica-Bold", 15) > card_width - 48:
            lines.append(line)
            line = word
        else:
            line = trial
    if line:
        lines.append(line)
    text_y = y + 285
    for line in lines:
        pdf.drawString(x + 24, text_y, line)
        text_y -= 22
    pdf.setFillColor(GREY)
    pdf.setFont("Helvetica", 11)
    text = pdf.beginText(x + 24, text_y - 18)
    text.setLeading(17)
    description_lines = []
    current_line = ""
    for word in description.split():
        trial = (current_line + " " + word).strip()
        if pdf.stringWidth(trial, "Helvetica", 11) > card_width - 48:
            description_lines.append(current_line)
            current_line = word
        else:
            current_line = trial
    if current_line:
        description_lines.append(current_line)
    for description_line in description_lines:
        text.textLine(description_line)
    pdf.drawText(text)
    pdf.setFillColor(RED)
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(x + 24, y + 28, pages)

pdf.setFillColor(GREY)
pdf.setFont("Helvetica", 9)
pdf.drawString(
    55,
    70,
    "Catalogue mockups communicate approved appearance. Final manufacturing artwork must be fitted to the selected supplier's garment templates.",
)
pdf.save()

sources = [
    INTRO,
    EXPORTS / "PCC Tournament Polo Collection 2026 - Review Catalogue.pdf",
    EXPORTS / "PCC Version 2 Chess Pieces Collection - Review Catalogue V2.pdf",
    EXPORTS / "PCC Tracksuit Jacket and Hoodie Collection 2026 - Review Catalogue.pdf",
]

writer = PdfWriter()
for source in sources:
    reader = PdfReader(str(source))
    for page in reader.pages:
        writer.add_page(page)

writer.add_metadata(
    {
        "/Title": "PCC Complete Apparel Catalogue 2026",
        "/Author": "Polokwane Chess Club",
        "/Subject": "Tournament polos, jackets and hoodies",
    }
)
with OUTPUT.open("wb") as stream:
    writer.write(stream)

print(OUTPUT)
