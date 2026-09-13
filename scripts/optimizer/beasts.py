"""Companions Data -> beasts, their skills and the affection stat table.

The beast list (Tier / Full Name / Skill Description / Skill X / awaken
columns None, 0..6 / 1st and 2nd Effect Name) sits beside a stat table: one
row per affection level, and for each tier (Common, Unique) and awaken level
(0..6) the columns Combat, Draco Combat, ATK/Affection and MSPD, in percent.
"""

from optimizer.workbook import MissingHeader, find_cell, header_columns, number, text

STATS = ["combat", "dracoCombat", "atkAffection", "mspd"]
EFFECTS = {"Increased Attack :": "atk", "Increased MSPD :": "mspd", "Increased Affection :": "affection"}
FAMILIES = ["Wolf", "Boar", "Bat", "Golem", "Draco"]
AWAKENINGS = 7


def _family(name):
    for family in FAMILIES:
        if name.endswith(family):
            return family
    raise ValueError(f"beast {name!r} is not a wolf, boar, bat, golem or draco")


def extract_beasts(sheet):
    """Return {"beasts": [...], "tables": {tier: {stat: [[level 1.. values] per awaken]}}}."""
    header_row, name_col = find_cell(sheet, "Full Name")
    cols = header_columns(sheet, header_row, ["Tier", "Skill Description", "Skill X", "1st Effect Name", "2nd Effect Name"])
    _, none_col = find_cell(sheet, "None", min_row=header_row, max_row=header_row, min_col=cols["Skill X"])

    beasts = []
    row = header_row + 2
    while text(sheet.cell(row, name_col).value):
        name = text(sheet.cell(row, name_col).value)
        effects = [EFFECTS[text(sheet.cell(row, cols[c]).value)] for c in ("1st Effect Name", "2nd Effect Name") if text(sheet.cell(row, cols[c]).value)]
        if not effects:
            raise ValueError(f"{sheet.title} row {row}: {name} has no mounted effect")
        x = sheet.cell(row, cols["Skill X"]).value
        beasts.append({
            "name": name,
            "family": _family(name),
            "tier": text(sheet.cell(row, cols["Tier"]).value),
            "mounted": effects,
            "skill": {
                "text": text(sheet.cell(row, cols["Skill Description"]).value),
                "x": number(x) if number(x) is not None else text(x),
                "values": [number(sheet.cell(row, none_col + 1 + a).value) or 0 for a in range(AWAKENINGS)],
            },
        })
        row += 1
    if not beasts:
        raise MissingHeader(f"{sheet.title}: no beasts under Full Name")

    stat_row, first_col = find_cell(sheet, "Combat")
    level_col = first_col - 1
    tier_row = stat_row - 4
    tables = {}
    for tier in sorted({b["tier"] for b in beasts}):
        _, tier_col = find_cell(sheet, tier, min_row=tier_row, max_row=tier_row, min_col=first_col)
        table = {stat: [] for stat in STATS}
        for awaken in range(AWAKENINGS):
            for offset, stat in enumerate(STATS):
                col = tier_col + awaken * len(STATS) + offset
                values = []
                r = stat_row + 1
                while number(sheet.cell(r, level_col).value) is not None:
                    value = number(sheet.cell(r, col).value)
                    if value is None:
                        break
                    if number(sheet.cell(r, level_col).value) != len(values) + 1:
                        raise ValueError(f"{sheet.title} row {r}: affection levels out of order")
                    values.append(value)
                    r += 1
                table[stat].append(values)
        tables[tier] = table
    return {"beasts": beasts, "tables": tables}
