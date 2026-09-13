"""Spirits: names and art from SPIRITS BASE, max level from SPIRIT COST.

Both tables live in Equipment Data. Elements and skills are not in the
workbook; extract-optimizer.py merges them in from the wiki by name.
"""

from optimizer.workbook import (
    MissingHeader,
    find_cell,
    header_columns,
    images_by_cell,
    number,
    rows_until_blank,
    text,
)

# SPIRITS BASE has one art column per rarity; Common is the base look.
ART_COLUMN = "Common"


def extract_spirit_max_level(sheet):
    """The last level listed in the SPIRIT COST table."""
    title_row, title_col = find_cell(sheet, "SPIRIT COST", max_row=1)
    col = header_columns(sheet, title_row + 1, ["Level"], min_col=title_col, max_col=title_col + 1)
    row, last = title_row + 2, None
    while (level := number(sheet.cell(row, col["Level"]).value)) is not None:
        last = level
        row += 1
    if last is None:
        raise MissingHeader(f"{sheet.title}: 'SPIRIT COST' table has no levels")
    return last


def extract_spirits(sheet):
    max_level = extract_spirit_max_level(sheet)
    title_row, title_col = find_cell(sheet, "SPIRITS BASE", max_row=1)
    col = header_columns(sheet, title_row + 1, ["NAME", ART_COLUMN], min_col=title_col)
    images = images_by_cell(sheet)

    spirits, icons = [], {}
    for index, row in enumerate(rows_until_blank(sheet, title_row + 2, col["NAME"])):
        name = text(sheet.cell(row, col["NAME"]).value)
        spirits.append({"id": index, "name": name, "maxLevel": max_level})
        icon = images.get((row, col[ART_COLUMN]))
        if icon is not None:
            icons[name] = icon
    return spirits, icons
