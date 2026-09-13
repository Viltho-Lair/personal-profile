"""Skills Data -> the skill proficiency bonus per level."""

from optimizer.workbook import header_columns, number, rows_until_blank

HEADERS = ["PROFICIENCY LEVEL", "PROFICIENCY BONUS"]


def extract_proficiency(sheet):
    """All Attribute DMG bonus (a fraction, 0.05 = 5%) per proficiency level; index is the level."""
    col = header_columns(sheet, 1, HEADERS)
    bonuses = []
    for row in rows_until_blank(sheet, 2, col["PROFICIENCY LEVEL"]):
        level = number(sheet.cell(row, col["PROFICIENCY LEVEL"]).value)
        bonus = number(sheet.cell(row, col["PROFICIENCY BONUS"]).value)
        if level != len(bonuses):
            raise ValueError(f"{sheet.title} row {row}: expected proficiency level {len(bonuses)}, found {level}")
        if not isinstance(bonus, (int, float)) or isinstance(bonus, bool):
            raise ValueError(f"{sheet.title} row {row}: proficiency level {level} has no bonus")
        bonuses.append(bonus)
    return bonuses
