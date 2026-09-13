"""Spirits: names, art per rarity and stat ratios from SPIRITS BASE, max level
from SPIRIT COST, and the level x awakening factor matrices.

All of it lives in Equipment Data. Elements and skills are not in the
workbook; extract-optimizer.py merges them in from the wiki by name.

A spirit's stat is ratio x factor(awakening, level) / 100, where ATK and HP
use the ATTACK HP FACTORS matrix and GOLD and EXP use GOLD EXP FACTOR.
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

RARITY_GROUPS = ["Common", "Great", "Rare", "Epic", "Legendary", "Mythic", "Immortal", "Ancient"]
STATS = {"ATK": "atk", "HP": "hp", "GOLD": "gold", "EXP": "exp"}
MATRICES = {"ATTACK HP FACTORS": "atkHp", "GOLD EXP FACTOR": "goldExp"}

PLACEHOLDER = "None"


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
    """Return (spirits, icons); icons maps "<name>|<rarity group>" to image bytes."""
    max_level = extract_spirit_max_level(sheet)
    title_row, title_col = find_cell(sheet, "SPIRITS BASE", max_row=1)
    col = header_columns(sheet, title_row + 1, ["NAME", *RARITY_GROUPS, *STATS], min_col=title_col)
    images = images_by_cell(sheet)

    spirits, icons = [], {}
    for row in rows_until_blank(sheet, title_row + 2, col["NAME"]):
        name = text(sheet.cell(row, col["NAME"]).value)
        if name == PLACEHOLDER:
            continue
        ratios = {}
        for header, key in STATS.items():
            value = number(sheet.cell(row, col[header]).value)
            if not isinstance(value, (int, float)):
                raise ValueError(f"{sheet.title} row {row}: spirit {name!r} has no {header} ratio")
            ratios[key] = value
        spirits.append({"id": len(spirits), "name": name, "maxLevel": max_level, "ratios": ratios})
        for group in RARITY_GROUPS:
            icon = images.get((row, col[group]))
            if icon is not None:
                icons[f"{name}|{group}"] = icon
    return spirits, icons


def extract_spirit_factors(sheet, max_level):
    """{"tiers": [...], "atkHp": {tier: [factor per level]}, "goldExp": {...}}.

    Each matrix has a title on row 1 above its first tier column, a LEVEL
    column just left of it, and one column per awakening tier.
    """
    result = {"tiers": None}
    for title, key in MATRICES.items():
        title_row, title_col = find_cell(sheet, title, max_row=1)
        header_row, level_col = title_row + 1, title_col - 1
        if text(sheet.cell(title_row, level_col).value) != "LEVEL":
            raise MissingHeader(f"{sheet.title}: no LEVEL column beside {title!r}")

        tiers = []
        for c in range(title_col, sheet.max_column + 1):
            tier = text(sheet.cell(header_row, c).value)
            if tier is None:
                break
            tiers.append((tier, c))
        if not tiers:
            raise MissingHeader(f"{sheet.title}: {title!r} has no awakening tiers")
        names = [tier for tier, _ in tiers]
        if result["tiers"] is None:
            result["tiers"] = names
        elif result["tiers"] != names:
            raise ValueError(f"{sheet.title}: {title!r} tiers differ from the other factor matrix")

        matrix = {tier: [] for tier in names}
        for level in range(max_level + 1):
            row = header_row + 1 + level
            if number(sheet.cell(row, level_col).value) != level:
                raise ValueError(f"{sheet.title} row {row}: {title!r} expected level {level}")
            for tier, c in tiers:
                value = number(sheet.cell(row, c).value)
                if not isinstance(value, (int, float)):
                    raise ValueError(f"{sheet.title} row {row}: {title!r} {tier} has no factor")
                matrix[tier].append(value)
        result[key] = matrix
    return result
