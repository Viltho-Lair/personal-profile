"""Reading helpers for the Slayer Legend Master Optimizer workbook.

Tables are located by header text rather than fixed column numbers: the
sheets hold several tables side by side, and columns get inserted between
copies of the workbook.
"""

from __future__ import annotations

import re
from io import BytesIO

from PIL import Image


class MissingHeader(Exception):
    """An expected title or header was not found where the extractor looked."""


def normalise(value) -> str:
    return re.sub(r"\s+", " ", str(value)).strip().casefold()


def find_cell(sheet, wanted, *, min_row=1, max_row=None, min_col=1, max_col=None):
    """Return (row, column) of the first cell whose text equals `wanted`."""
    target = normalise(wanted)
    for row in sheet.iter_rows(
        min_row=min_row,
        max_row=max_row or sheet.max_row,
        min_col=min_col,
        max_col=max_col or sheet.max_column,
    ):
        for cell in row:
            if cell.value is not None and normalise(cell.value) == target:
                return cell.row, cell.column
    raise MissingHeader(f"{sheet.title}: no cell reading {wanted!r}")


def header_columns(sheet, header_row, names, *, min_col=1, max_col=None):
    """Map each header name to its column on `header_row`."""
    wanted = {normalise(name): name for name in names}
    found = {}
    for col in range(min_col, (max_col or sheet.max_column) + 1):
        value = sheet.cell(header_row, col).value
        if value is None:
            continue
        name = wanted.get(normalise(value))
        if name is not None and name not in found:
            found[name] = col
    missing = [name for name in names if name not in found]
    if missing:
        raise MissingHeader(
            f"{sheet.title} row {header_row}: missing headers {missing}"
        )
    return found


def number(value):
    """Whole floats become ints; numeric text is read; anything else is None."""
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        try:
            value = float(value.replace(",", ""))
        except ValueError:
            return None
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


def text(value):
    if value is None:
        return None
    cleaned = " ".join(str(value).split())
    return cleaned or None


def rows_until_blank(sheet, first_row, key_col):
    """Row numbers from `first_row` while the key column holds text."""
    row = first_row
    while text(sheet.cell(row, key_col).value) is not None:
        yield row
        row += 1


def slug(value) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(value).lower()).strip("-")


def split_grade(value):
    """'Common 4' -> ('Common', 4); 'Immortal' -> ('Immortal', None)."""
    match = re.fullmatch(r"([A-Za-z]+)\s*(\d+)?", value.strip())
    if not match:
        return value.strip(), None
    return match.group(1), int(match.group(2)) if match.group(2) else None


def images_by_cell(sheet):
    """{(row, column): image bytes} for every image anchored to a cell."""
    found = {}
    for image in getattr(sheet, "_images", []):
        anchor = getattr(image.anchor, "_from", None)
        if anchor is not None:
            found[(anchor.row + 1, anchor.col + 1)] = image._data()
    return found


def image_size(data):
    with Image.open(BytesIO(data)) as picture:
        return picture.size


def largest_image_on_row(images, row, first_col, last_col):
    """The biggest image anchored on `row` between two columns, if any."""
    candidates = [
        data
        for (r, c), data in images.items()
        if r == row and first_col <= c <= last_col
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda data: image_size(data)[0] * image_size(data)[1])
