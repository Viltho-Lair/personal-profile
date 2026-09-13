"""Familiar Data -> familiars, their stats per star, art and the Mana Altar.

The sheet keeps the game's raw tables side by side:
  - DemonSkillData (Id, Level, ..., AttackRange1__1 ...): stats per star 0-11
  - DemonAltarData (Id, Level, SkillDmgAdd, Soul, NeedLevelCount): Mana Altar
  - "Familliar RARITIES": star -> rarity name, and the roster with art per
    star band ("0*-5*", "6*-7*", ...), symbol and game id
  - a block of per-familiar rows whose formulas VLOOKUP their stat columns,
    and whose 11-star effect text sits in an IF formula
"""

import re

from optimizer.workbook import (
    MissingHeader,
    find_header_row,
    images_by_cell,
    number,
    rows_until_blank,
    text,
)

GROUPS = {1: "weapon", 2: "attribute", 3: "battle"}
ELEMENT_IDS = {1: "Fire", 2: "Water", 3: "Wind", 4: "Earth"}
STAR_BAND = re.compile(r"^(\d+)\*(?:-(\d+)\*)?$")
VLOOKUP_COLUMN = re.compile(r"VLOOKUP\([^,]+,\s*[A-Z]+\$?\d+:[A-Z]+\$?\d+\s*,\s*(\d+)\s*,", re.IGNORECASE)
SPECIAL = re.compile(r'"(\+[^"]+)"')


def display_name(code):
    return code.capitalize()


def _star_table(sheet):
    header_row, col = find_header_row(sheet, ["Grade", "EffectLevel", "AttackRange1__1"])
    # Another table's Id/Level headers come first on the same row, so this
    # table's are found relative to its Grade column.
    first, level_col = col["Grade"] - 2, col["Grade"] - 1
    if [text(sheet.cell(header_row, c).value) for c in (first, level_col)] != ["Id", "Level"]:
        raise MissingHeader(f"{sheet.title} row {header_row}: expected Id and Level before Grade")
    headers = []
    for c in range(first, sheet.max_column + 1):
        name = text(sheet.cell(header_row, c).value)
        if name is None:
            break
        headers.append(name)
    stars = {}
    for row in rows_until_blank(sheet, header_row + 1, level_col):
        level = number(sheet.cell(row, level_col).value)
        if not isinstance(level, int) or level in stars:
            break  # the table ends where the level column stops counting stars
        stars[level] = {name: number(sheet.cell(row, first + i).value) for i, name in enumerate(headers)}
    return headers, stars


def _altar(sheet):
    header_row, col = find_header_row(sheet, ["Id", "Level", "SkillDmgAdd", "Soul", "NeedLevelCount"])
    levels = []
    for row in rows_until_blank(sheet, header_row + 1, col["Level"]):
        levels.append({
            "level": number(sheet.cell(row, col["Level"]).value),
            "skillDamage": number(sheet.cell(row, col["SkillDmgAdd"]).value),
            "soul": number(sheet.cell(row, col["Soul"]).value),
            "starsNeeded": number(sheet.cell(row, col["NeedLevelCount"]).value),
        })
    return levels


def _rarities(sheet):
    header_row, col = find_header_row(sheet, ["Rarity", "Rarity Group"])
    rarities = {}
    for row in rows_until_blank(sheet, header_row + 1, col["Rarity"]):
        star = number(sheet.cell(row, col["Rarity"]).value)
        if isinstance(star, int):
            rarities[star] = text(sheet.cell(row, col["Rarity Group"]).value)
    return rarities


def _stat_rows(sheet, names, headers):
    """{familiar code: ([(label, stat column, percent)], 11-star effect)} from the formula block."""
    found = {}
    for row in range(1, sheet.max_row + 1):
        for key_col in range(1, 6):
            code = text(sheet.cell(row, key_col).value)
            if code not in names or code in found:
                continue
            stats, labels = [], set()
            for offset in (2, 4):
                label = text(sheet.cell(row, key_col + offset).value)
                formula = sheet.cell(row, key_col + offset + 1).value
                match = VLOOKUP_COLUMN.search(formula) if isinstance(formula, str) else None
                if not label or not match:
                    continue
                label = label.rstrip(" :")
                column = headers[int(match.group(1)) - 1]
                if (label, column) not in labels:
                    labels.add((label, column))
                    stats.append({"label": label, "column": column, "percent": "/100" in formula.replace(" ", "")})
            if stats:
                effect = sheet.cell(row, key_col + 6).value
                special = SPECIAL.search(effect) if isinstance(effect, str) else None
                found[code] = (stats, special.group(1).lstrip("+ ").strip() if special else None)
    return found


def _elements(sheet):
    cell_row, col = None, None
    for row in range(1, sheet.max_row + 1):
        for c in range(1, sheet.max_column + 1):
            if text(sheet.cell(row, c).value) == "Applicable elemental dmg":
                cell_row, col = row, c
                break
        if cell_row:
            break
    if cell_row is None:
        raise MissingHeader(f"{sheet.title}: missing 'Applicable elemental dmg'")
    elements = {}
    for row in range(cell_row + 1, cell_row + 5):
        code, element_id = text(sheet.cell(row, col).value), number(sheet.cell(row, col + 1).value)
        if code and element_id in ELEMENT_IDS:
            elements[code] = ELEMENT_IDS[element_id]
    return elements


def extract_familiars(sheet):
    """Return (familiars, altar, art); art maps a file stem to image bytes."""
    headers, stars = _star_table(sheet)
    rarities = _rarities(sheet)
    altar = _altar(sheet)

    header_row, col = find_header_row(sheet, ["name", "symbol", "id"])
    bands = []
    for c in range(col["name"] + 1, col["symbol"]):
        match = STAR_BAND.match(text(sheet.cell(header_row, c).value) or "")
        if match:
            low = int(match.group(1))
            bands.append((c, low, int(match.group(2) or low)))
    if not bands:
        raise MissingHeader(f"{sheet.title} row {header_row}: no star band headers like '0*-5*'")

    roster = []
    for row in rows_until_blank(sheet, header_row + 1, col["name"]):
        code = text(sheet.cell(row, col["name"]).value)
        game_id = number(sheet.cell(row, col["id"]).value)
        if code == "None" or not isinstance(game_id, int):
            continue
        roster.append((row, code, game_id))

    stat_rows = _stat_rows(sheet, {code for _, code, _ in roster}, headers)
    elements = _elements(sheet)
    images = images_by_cell(sheet)
    familiars, art = [], {}

    for row, code, game_id in roster:
        if code not in stat_rows:
            raise ValueError(f"{sheet.title}: no stat formulas for familiar {code!r}")
        stats, special = stat_rows[code]
        slug = code.lower()

        band_art = []
        for c, low, high in bands:
            data = images.get((row, c))
            stem = f"{slug}-{low}" if low == high else f"{slug}-{low}-{high}"
            if data is not None:
                art[stem] = data
            band_art.append({"from": low, "to": high, "icon": stem if data is not None else None})
        symbol = images.get((row, col["symbol"]))
        if symbol is not None:
            art[f"{slug}-symbol"] = symbol

        per_star = []
        for star in sorted(stars):
            values = {}
            for stat in stats:
                raw = stars[star].get(stat["column"])
                values[stat["label"]] = None if raw is None else (raw / 100 if stat["percent"] else raw)
            per_star.append({"star": star, "rarity": rarities.get(star), "values": values})

        familiars.append({
            "id": game_id,
            "name": display_name(code),
            "group": GROUPS.get(game_id // 100),
            "element": elements.get(code),
            "stats": [{"label": s["label"], "percent": s["percent"]} for s in stats],
            "stars": per_star,
            "special": special,
            "art": band_art,
            "symbol": f"{slug}-symbol" if symbol is not None else None,
        })

    return familiars, altar, art
