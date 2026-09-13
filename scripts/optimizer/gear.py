"""Weapons, accessories and the enhance level factor table (Equipment Data)."""

from optimizer.workbook import (
    MissingHeader,
    find_cell,
    find_header_row,
    header_columns,
    images_by_cell,
    number,
    rows_until_blank,
    split_grade,
    text,
)

TIER_ORDER = ["Common", "Great", "Rare", "Epic", "Legendary", "Mythic", "Immortal"]

# Each table's secondary stats, by sheet header -> JSON key.
SECONDARY = {
    "WEAPONS": {
        "CRIT HIT WHEN 0": "critHitAt0",
        "GOLD BONUS": "goldBonus",
        "CRIT HIT INCREASE AT 0": "critHitIncreaseAt0",
    },
    "ACCESSORIES": {
        "MAX MANA AT 0": "maxManaAt0",
        "EXP Bonus": "expBonus",
        "MANA RECOVERY AT 0": "manaRecoveryAt0",
    },
}


def extract_gear(sheet, title):
    """Grades from the WEAPONS or ACCESSORIES table, lowest grade first."""
    secondary = SECONDARY[title]
    title_row, _ = find_cell(sheet, title, max_col=1)
    header_row = title_row + 1
    col = header_columns(sheet, header_row, ["TYPE", "MULTIPLIER", "MAX LVL", *secondary])

    grades = []
    for row in rows_until_blank(sheet, header_row + 1, col["TYPE"]):
        grade = text(sheet.cell(row, col["TYPE"]).value)
        tier, grade_number = split_grade(grade)
        grades.append({
            "grade": grade,
            "tier": tier,
            "gradeNumber": grade_number,
            "tierRank": TIER_ORDER.index(tier) if tier in TIER_ORDER else None,
            "multiplier": number(sheet.cell(row, col["MULTIPLIER"]).value),
            "baseMaxLevel": number(sheet.cell(row, col["MAX LVL"]).value),
            "secondary": {
                key: number(sheet.cell(row, col[header]).value)
                for header, key in secondary.items()
            },
        })
    return grades


def extract_gear_icons(equipment_sheet, header):
    """Grade art from the EQUIPMENT sheet's WEAPON or ACCESSORY table.

    The header is merged over two columns: art is anchored in the first and
    the grade name sits in the second.
    """
    header_row, col = find_header_row(equipment_sheet, [header, "ENHANCE LVL"])
    art_col = col[header]
    name_col = art_col + 1
    images = images_by_cell(equipment_sheet)

    icons = {}
    for row in rows_until_blank(equipment_sheet, header_row + 1, name_col):
        data = images.get((row, art_col))
        if data is not None:
            icons[text(equipment_sheet.cell(row, name_col).value)] = data
    return icons


def extract_level_factors(sheet):
    """Equip effect factor per enhance level; list index is the level.

    Equip effect % = grade multiplier x factor[level]; owned effect is 30% of it.
    """
    title_row, title_col = find_cell(sheet, "Equip ATK factor", max_row=1)
    header_row = title_row + 1
    col = header_columns(sheet, header_row, ["Stage", "Factor"], min_col=title_col, max_col=title_col + 1)

    factors = []
    row = header_row + 1
    while (level := number(sheet.cell(row, col["Stage"]).value)) is not None:
        if level != len(factors):
            raise MissingHeader(
                f"{sheet.title} row {row}: expected level {len(factors)}, found {level}"
            )
        factors.append(number(sheet.cell(row, col["Factor"]).value))
        row += 1

    if not factors:
        raise MissingHeader(f"{sheet.title}: 'Equip ATK factor' table has no levels")
    return factors
