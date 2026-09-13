"""Soul weapons from the Equipment Data SOUL WEAPONS table."""

import re

from optimizer.workbook import (
    find_cell,
    header_columns,
    images_by_cell,
    number,
    rows_until_blank,
    text,
)

HEADERS = [
    "NAME", "ICON", "SOUL COLOR", "REQUIREMENTS", "ATTACK",
    "STAGE REQUIREMENT", "Engraving ATK", "Engraving HP",
]
PLACEHOLDER = "None"
GRADE_SUFFIX = re.compile(r"^(.*?)\s*(Grade\s*\d+)$", re.IGNORECASE)


def split_requirement(value):
    """'Steel Sword Grade 1' -> ('Steel Sword', 'Grade 1')."""
    raw = text(value)
    if raw is None:
        return None, None
    match = GRADE_SUFFIX.match(raw)
    return (match.group(1), match.group(2)) if match else (raw, None)


def soul_weapon_name(value):
    """The sheet's name, or a stable label for rows it hasn't named yet.

    Unnamed rows hold their unlock stage (a number) in the name cell.
    """
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return f"Unnamed (stage {number(value)})"
    return text(value)


def extract_soul_weapons(sheet):
    title_row, title_col = find_cell(sheet, "SOUL WEAPONS", max_row=1)
    col = header_columns(sheet, title_row + 1, HEADERS, min_col=title_col)
    images = images_by_cell(sheet)

    weapons, icons = [], {}
    for row in rows_until_blank(sheet, title_row + 2, col["NAME"]):
        name = soul_weapon_name(sheet.cell(row, col["NAME"]).value)
        if name == PLACEHOLDER:
            continue

        def value(header, row=row):
            return number(sheet.cell(row, col[header]).value)

        cost = value("REQUIREMENTS")
        # REQUIREMENTS and STAGE REQUIREMENT are merged two-column headers: the
        # unlabelled column to the right holds the weapon text and stage name.
        item, grade = split_requirement(sheet.cell(row, col["REQUIREMENTS"] + 1).value)

        weapons.append({
            "id": len(weapons) + 1,
            "name": name,
            "soulColor": text(sheet.cell(row, col["SOUL COLOR"]).value),
            "attack": value("ATTACK"),
            "cost": cost,
            # Not stored in the workbook; it is half the cost for all 81
            # soul weapons the wiki lists.
            "disassemblyReward": number(cost / 2) if cost is not None else None,
            "requirement": {"item": item, "grade": grade},
            "stage": {
                "number": value("STAGE REQUIREMENT"),
                "name": text(sheet.cell(row, col["STAGE REQUIREMENT"] + 1).value),
            },
            "engraving": {"atk": value("Engraving ATK"), "hp": value("Engraving HP")},
        })

        icon = images.get((row, col["ICON"]))
        if icon is not None:
            icons[name] = icon

    return weapons, icons
