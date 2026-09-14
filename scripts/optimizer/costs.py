"""Upgrade cost tables: what levelling gear, spirits, enhance stats and companion passives costs.

Equipment Data holds the cube tables ("Orr Cost", "Weapon Cost Factor", "Class Cost Factor") and the spirit
crystal table ("SPIRIT COST"); Gold Enhancement Data holds the gold multiplier bands for ATK, HP and HP Recovery
("Multiple" from each "Multiplier Starting Interval") and the "CRIT % COST TABLE"; Companions Data holds a
Stone and Emerald table per companion, a (Stone, Emerald) column pair per passive.
"""

from optimizer.workbook import MissingHeader, find_cell, number, text


def _level_table(sheet, title, value_header):
    """Values by level under `title`: a Level column with `value_header` next to it, level 0 first."""
    title_row, title_col = find_cell(sheet, title)
    header_row = title_row + 1
    if text(sheet.cell(header_row, title_col).value) != "Level":
        raise MissingHeader(f"{sheet.title}: no Level column under {title!r}")
    value_col = None
    for c in range(title_col + 1, title_col + 3):
        if text(sheet.cell(header_row, c).value) == value_header:
            value_col = c
    if value_col is None:
        raise MissingHeader(f"{sheet.title}: no {value_header!r} column under {title!r}")
    values = []
    row = header_row + 1
    while row <= sheet.max_row:
        level = number(sheet.cell(row, title_col).value)
        if not isinstance(level, (int, float)):
            break
        if int(level) != len(values):
            raise ValueError(f"{sheet.title} row {row}: expected level {len(values)} under {title!r}, found {level}")
        values.append(number(sheet.cell(row, value_col).value) or 0)
        row += 1
    if not values:
        raise MissingHeader(f"{sheet.title}: no levels under {title!r}")
    return values


def extract_cube_costs(equipment_sheet):
    """The cube tables: Orr base cost by level, the weapon/accessory factor by grade and the class factor by class grade."""
    orr = _level_table(equipment_sheet, "Orr Cost", "Cost")

    title_row, title_col = find_cell(equipment_sheet, "Weapon Cost Factor")
    weapon_factors = {}
    row = title_row + 2
    while row <= equipment_sheet.max_row:
        grade = text(equipment_sheet.cell(row, title_col).value)
        factor = number(equipment_sheet.cell(row, title_col + 1).value)
        if not grade or not isinstance(factor, (int, float)):
            break
        weapon_factors[grade] = factor
        row += 1

    title_row, title_col = find_cell(equipment_sheet, "Class Cost Factor")
    class_factors = []
    row = title_row + 2
    while row <= equipment_sheet.max_row:
        grade = number(equipment_sheet.cell(row, title_col).value)
        factor = number(equipment_sheet.cell(row, title_col + 1).value)
        if not isinstance(grade, (int, float)) or not isinstance(factor, (int, float)):
            break
        if int(grade) != len(class_factors) + 1:
            raise ValueError(f"{equipment_sheet.title} row {row}: expected class grade {len(class_factors) + 1}, found {grade}")
        class_factors.append(factor)
        row += 1

    if not weapon_factors or not class_factors:
        raise MissingHeader(f"{equipment_sheet.title}: empty cost factor tables")
    return {"orr": orr, "weaponFactors": weapon_factors, "classFactors": class_factors}


def extract_spirit_crystals(equipment_sheet):
    """Mana Crystals to take a spirit from each level to the next, level 0 first."""
    return _level_table(equipment_sheet, "SPIRIT COST", "Crystal")


def extract_gold_costs(gold_sheet):
    """CRIT % gold by level, and the ATK/HP/HP Recovery multiplier bands: [{from, multiple}] up to level 1,000,000."""
    crit_chance = _level_table(gold_sheet, "CRIT % COST TABLE", "COST TO NXT LEVEL")

    header_row, multiple_col = find_cell(gold_sheet, "Multiple")
    start_col = multiple_col + 1
    if text(gold_sheet.cell(header_row, start_col).value) != "Multiplier Starting Interval":
        raise MissingHeader(f"{gold_sheet.title}: no Multiplier Starting Interval next to Multiple")
    bands = []
    row = header_row + 1
    while row <= gold_sheet.max_row:
        multiple = number(gold_sheet.cell(row, multiple_col).value)
        start = number(gold_sheet.cell(row, start_col).value)
        if not isinstance(multiple, (int, float)):
            break
        start = 1 if not bands and not isinstance(start, (int, float)) else start
        if not isinstance(start, (int, float)) or start >= 1_000_000:
            break
        bands.append({"from": int(start), "multiple": multiple})
        row += 1
    if not bands:
        raise MissingHeader(f"{gold_sheet.title}: no gold multiplier bands")
    return {"critChance": crit_chance, "bands": bands}


def extract_companion_passive_costs(companions_sheet, companions):
    """{companion: {passive: {"stone": [by level 0-99], "emerald": [...]}}} from each companion's Level table."""
    costs = {}
    for companion in companions:
        # The companion's name sits over its table's Level column; the name appears elsewhere on the sheet too.
        found = None
        for row in companions_sheet.iter_rows():
            for cell in row:
                if text(cell.value) == companion and text(companions_sheet.cell(cell.row + 1, cell.column).value) == "Level":
                    found = (cell.row, cell.column)
                    break
            if found:
                break
        if not found:
            raise MissingHeader(f"{companions_sheet.title}: no Level table under {companion!r}")
        title_row, title_col = found
        header_row = title_row + 1
        passives = {}
        c = title_col + 1
        while c <= companions_sheet.max_column:
            name = text(companions_sheet.cell(header_row, c).value)
            if not name:
                break
            stone, emerald = [], []
            row = header_row + 2
            while row <= companions_sheet.max_row:
                level = number(companions_sheet.cell(row, title_col).value)
                if not isinstance(level, (int, float)):
                    break
                stone.append(number(companions_sheet.cell(row, c).value) or 0)
                emerald.append(number(companions_sheet.cell(row, c + 1).value) or 0)
                row += 1
            passives[name] = {"stone": stone, "emerald": emerald}
            c += 2
        if not passives:
            raise MissingHeader(f"{companions_sheet.title}: no passives under {companion!r}")
        costs[companion] = passives
    return costs
