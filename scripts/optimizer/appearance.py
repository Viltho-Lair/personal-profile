"""APPEARANCE + CHARACTER -> owned clothing and guild shop outfits.

APPEARANCE lists clothing (OWN / CLOTHING / BONUS TYPE / EFFECT) with its art
in the column before the name, and a GUILD SHOP APPEARANCE table beside it.
CHARACTER's Promotion Additional Ability rows show which sweatsuits raise a
row's multiplier: IFS(..., APPEARANCE!$C$64, "(x 4)", APPEARANCE!$C$57, "(x 3)", ...).
"""

import re

from optimizer.workbook import MissingHeader, find_cell, header_columns, images_by_cell, number, text

SUIT_REF = re.compile(r"APPEARANCE!\$?C\$?(\d+)\s*,\s*\"\(x (\d)\)\"")


def _table(sheet, images, header_row, name_col, bonus_col, effect_col, first_row):
    items = []
    row = first_row
    while text(sheet.cell(row, name_col).value):
        value = number(sheet.cell(row, effect_col).value)
        if value is None:
            raise ValueError(f"{sheet.title} row {row}: {text(sheet.cell(row, name_col).value)} has no effect value")
        items.append({
            "name": text(sheet.cell(row, name_col).value),
            "bonus": text(sheet.cell(row, bonus_col).value),
            "value": value,
            "row": row,
            "art": images.get((row, name_col - 1)),
        })
        row += 1
    return items


def extract_appearance(sheet, character_sheet):
    """Return (clothing, guild, art); art maps "clothing-<i>" / "guild-<i>" to image bytes."""
    images = images_by_cell(sheet)

    clothing_header, clothing_col = find_cell(sheet, "CLOTHING", max_row=10)
    cols = header_columns(sheet, clothing_header, ["BONUS TYPE", "EFFECT"], max_col=clothing_col + 5)
    # The name sits one column right of the merged CLOTHING header, the art under the header.
    clothing = _table(sheet, images, clothing_header, clothing_col + 1, cols["BONUS TYPE"], cols["EFFECT"], clothing_header + 1)

    guild_title, _ = find_cell(sheet, "GUILD SHOP APPEARANCE")
    guild_header, guild_col = find_cell(sheet, "CLOTHING", min_row=guild_title + 1)
    gcols = header_columns(sheet, guild_header, ["BONUS TYPE", "EFFECT"], min_col=guild_col)
    guild = _table(sheet, images, guild_header, guild_col + 1, gcols["BONUS TYPE"], gcols["EFFECT"], guild_header + 1)
    if not clothing or not guild:
        raise MissingHeader(f"{sheet.title}: clothing or guild shop table is empty")

    # Sweatsuits that multiply a Promotion Additional Ability row.
    by_row = {item["row"]: item for item in clothing}
    ability_rows = []
    for row in character_sheet.iter_rows():
        for cell in row:
            if isinstance(cell.value, str) and "APPEARANCE!" in cell.value and SUIT_REF.search(cell.value):
                if cell.row not in ability_rows:
                    ability_rows.append(cell.row)
        if len(ability_rows) >= 7:
            break
    for index, sheet_row in enumerate(ability_rows[:7]):
        formula = next(c.value for c in character_sheet[sheet_row] if isinstance(c.value, str) and SUIT_REF.search(c.value))
        for suit_row, multiplier in SUIT_REF.findall(formula):
            suit = by_row.get(int(suit_row))
            if suit:
                suit["promotionRow"] = index
                suit["multiplier"] = int(multiplier)

    art = {}
    for prefix, items in (("clothing", clothing), ("guild", guild)):
        for i, item in enumerate(items):
            data = item.pop("art")
            item.pop("row")
            item["key"] = f"{prefix}-{i}"
            if data:
                art[item["key"]] = data
    return clothing, guild, art
