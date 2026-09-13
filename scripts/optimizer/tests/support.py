"""Builds small in-memory sheets shaped like the optimizer's tables."""

from io import BytesIO

from openpyxl import Workbook, load_workbook
from openpyxl.drawing.image import Image as SheetImage
from openpyxl.styles import PatternFill
from openpyxl.worksheet.datavalidation import DataValidation
from PIL import Image


def png(size):
    buffer = BytesIO()
    Image.new("RGBA", (size, size), (200, 40, 40, 255)).save(buffer, "PNG")
    buffer.seek(0)
    return buffer


def build_sheet(cells, *, title="Data", images=(), fills=None, validations=()):
    """Write `cells` ({"A1": value}), square images ([("C3", 128)]), solid
    fills ({"B2": "FF666666"}) and whole-number validations ([("D9", 0, 10)]).

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
    for ref, colour in (fills or {}).items():
        sheet[ref].fill = PatternFill("solid", fgColor=colour)
    for ref, low, high in validations:
        validation = DataValidation(type="decimal", operator="between", formula1=str(low), formula2=str(high))
        validation.add(ref)
        sheet.add_data_validation(validation)
    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return load_workbook(buffer)[title]
