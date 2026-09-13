"""Weapons, accessories, the enhance level factor table and awakening (Equipment Data)."""

import re

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


AWAKEN_HEADERS = {
    "Awakened Level": "awakening",
    "Max": "maxLevel",
    "Orr Multiplier": "weaponMultiplier",
    "Orr Crit Multiplier": "weaponCritHit",
    "Orr Gold Multiplier": "weaponGold",
    "Orb Mana": "accessoryMaxMana",
    "Orb EXP": "accessoryExp",
    "Orb Multiplier": "accessoryMultiplier",
}


BLAST_MULTIPLIER = "Blast Equipped Multiplier"


def extract_awakening(sheet):
    """One row per awakening (0-30): the max enhance level every weapon or
    accessory reaches, and the Immortal grade's awakened multipliers.

    Weapons are awakened with Orr, accessories with Orb.
    """
    header_row, col = find_header_row(sheet, list(AWAKEN_HEADERS))
    blast_col = next(
        (c for c in range(1, sheet.max_column + 1) if text(sheet.cell(header_row, c).value) == BLAST_MULTIPLIER),
        None,
    )
    rows = []
    for row in rows_until_blank(sheet, header_row + 1, col["Awakened Level"]):
        entry = {key: number(sheet.cell(row, col[header]).value) for header, key in AWAKEN_HEADERS.items()}
        # Awakened Blast only goes to 18, so this column ends before the others.
        blast = number(sheet.cell(row, blast_col).value) if blast_col else None
        if entry["awakening"] != len(rows):
            raise ValueError(f"{sheet.title} row {row}: expected awakening {len(rows)}, found {entry['awakening']}")
        if any(value is None for value in entry.values()):
            raise ValueError(f"{sheet.title} row {row}: awakening {entry['awakening']} has a blank value")
        entry["blastMultiplier"] = blast
        rows.append(entry)
    if not rows:
        raise MissingHeader(f"{sheet.title}: the awakening table has no rows")
    return rows


IMMORTAL_ART = re.compile(r"^(Orr|Orb)(?:\s+(\d+)\*)?$")


def extract_immortal_art(sprites_sheet):
    """{"weapons": {from awakening: bytes}, "accessories": {...}} from the Sprites
    sheet's "Orr", "Orr 6*" ... "Orb 30*" labels, each with its art to the right."""
    images = images_by_cell(sprites_sheet)
    art = {"weapons": {}, "accessories": {}}
    for row in sprites_sheet.iter_rows():
        for cell in row:
            match = IMMORTAL_ART.match(text(cell.value) or "")
            if not match:
                continue
            data = images.get((cell.row, cell.column + 1))
            if data is None:
                continue
            kind = "weapons" if match.group(1) == "Orr" else "accessories"
            art[kind][int(match.group(2) or 0)] = data
    for kind, found in art.items():
        if 0 not in found:
            raise MissingHeader(f"{sprites_sheet.title}: no Immortal art for {kind} ('Orr' / 'Orb')")
    return art
