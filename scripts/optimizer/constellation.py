"""Constellation Data -> the Constellation of Light: signs, their star nodes and levels.

  - node table (NodeId, SIGN, SubNodeId, StarSize, StarEnergy, BuffType, AppliesTo,
    BuffValue, Element, UnlockLevel)
  - level table (NeedsStarsCrafted, Level, Extra ATK, Extra HP, Extra HP Recovery,
    StarCraftingTimeReduced, ClassBonuslevelCap)
  - art: a column of names ("Aries", "Star of Fire (Small)", "CUBE", ...) with the
    image beside each; zodiac names appear twice, the second time with larger art
"""

from optimizer.workbook import (
    MissingHeader, find_header_row, image_size, images_by_cell, number, rows_until_blank, slug, text,
)

NODE = ["NodeId", "SIGN", "SubNodeId", "StarSize", "StarEnergy", "BuffType", "AppliesTo", "BuffValue", "Element", "UnlockLevel"]
LEVEL = ["NeedsStarsCrafted", "Level", "Extra ATK", "Extra HP", "Extra HP Recovery", "StarCraftingTimeReduced", "ClassBonuslevelCap"]


def extract_constellation(sheet):
    """Return (constellation, art); art maps a file stem to image bytes."""
    header_row, col = find_header_row(sheet, NODE + LEVEL)

    signs = {}
    for row in rows_until_blank(sheet, header_row + 1, col["NodeId"]):
        sign = text(sheet.cell(row, col["SIGN"]).value)
        node = {
            "id": number(sheet.cell(row, col["NodeId"]).value),
            "number": number(sheet.cell(row, col["SubNodeId"]).value),
            "size": text(sheet.cell(row, col["StarSize"]).value),
            "energy": number(sheet.cell(row, col["StarEnergy"]).value),
            "buff": text(sheet.cell(row, col["BuffType"]).value),
            "appliesTo": text(sheet.cell(row, col["AppliesTo"]).value),
            "value": number(sheet.cell(row, col["BuffValue"]).value),
            "element": text(sheet.cell(row, col["Element"]).value),
            "unlockLevel": number(sheet.cell(row, col["UnlockLevel"]).value),
        }
        if not isinstance(node["id"], int) or not sign:
            raise ValueError(f"{sheet.title} row {row}: constellation node without an id or sign")
        signs.setdefault(sign, {"name": sign, "nodes": []})["nodes"].append(node)

    levels = []
    for row in rows_until_blank(sheet, header_row + 1, col["Level"]):
        levels.append({
            "level": number(sheet.cell(row, col["Level"]).value),
            "starsNeeded": number(sheet.cell(row, col["NeedsStarsCrafted"]).value),
            "extraAtk": number(sheet.cell(row, col["Extra ATK"]).value),
            "extraHp": number(sheet.cell(row, col["Extra HP"]).value),
            "extraHpRecovery": number(sheet.cell(row, col["Extra HP Recovery"]).value),
            "craftingTimeReduced": number(sheet.cell(row, col["StarCraftingTimeReduced"]).value),
            "classLevelCap": number(sheet.cell(row, col["ClassBonuslevelCap"]).value),
        })
    if not signs or not levels:
        raise MissingHeader(f"{sheet.title}: constellation node or level table is empty")

    # Art sits beside a name column; take the largest image per name (zodiac signs repeat larger).
    images = images_by_cell(sheet)
    art, sizes = {}, {}
    for (r, c), data in images.items():
        name = text(sheet.cell(r, c - 1).value)
        if not name:
            continue
        stem = slug(name)
        width = image_size(data)[0]
        if width > sizes.get(stem, 0):
            art[stem], sizes[stem] = data, width

    ordered = sorted(signs.values(), key=lambda s: min(n["unlockLevel"] for n in s["nodes"]))
    for sign in ordered:
        sign["icon"] = slug(sign["name"]) if slug(sign["name"]) in art else None
        sign["unlockLevel"] = min(n["unlockLevel"] for n in sign["nodes"])
        sign["element"] = sign["nodes"][0]["element"]
    return {"signs": ordered, "levels": levels}, art
