"""Builds small in-memory sheets shaped like the optimizer's tables."""

from io import BytesIO

from openpyxl import Workbook, load_workbook
from openpyxl.drawing.image import Image as SheetImage
from PIL import Image


def png(size):
    buffer = BytesIO()
    Image.new("RGBA", (size, size), (200, 40, 40, 255)).save(buffer, "PNG")
    buffer.seek(0)
    return buffer


def build_sheet(cells, *, title="Data", images=()):
    """Write `cells` ({"A1": value}) and square images ([("C3", 128)]).

    The workbook is saved and reloaded, because openpyxl only turns image
    anchors into row/column objects when it reads a file.
    """
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = title
    for ref, value in cells.items():
        sheet[ref] = value
    for ref, size in images:
        sheet.add_image(SheetImage(png(size)), ref)
    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return load_workbook(buffer)[title]
