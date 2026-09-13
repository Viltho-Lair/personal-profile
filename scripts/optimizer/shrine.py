"""Equipment Data + EQUIPMENT -> Sealed Shrine statues.

Equipment Data holds one level table per statue side by side under a row of
statue names (Order, Demon, Chaos, Dragon): a "level" column then its stats in
whole percents. EQUIPMENT's SEALED SHRINE panel carries each statue's art.
"""

from optimizer.workbook import MissingHeader, find_cell, images_by_cell, number, text

STATUES = {
    "Dragon": {"name": "Statue of Dragon", "stats": {"Str": "STR ATK Growth", "Hp": "HP HP Growth", "Vit": "VIT HP Recovery Growth", "Cri": "CRI Crit Growth", "Luk": "LUK Gold Growth"}},
    "Order": {"name": "Statue of Order", "stats": {"Fire": "Amplify Fire Dmg", "Water": "Amplify Water Dmg", "Wind": "Amplify Wind Dmg", "Earth": "Amplify Earth Dmg"}},
    "Chaos": {"name": "Statue of Chaos", "stats": {"SW Atk": "Soul Weapon ATK", "Ch Atk": "Character ATK"}},
    "Demon": {"name": "Statue of Demon", "stats": {"Ch HP": "Character HP", "Amp Skill": "Amplify Skill Dmg"}},
}


def extract_shrine(data_sheet, panel_sheet):
    """Return (statues, art); art maps statue key to image bytes."""
    title_row, _ = find_cell(data_sheet, "Order")
    header_row = title_row + 1
    statues = []
    for key, meta in STATUES.items():
        _, col = find_cell(data_sheet, key, min_row=title_row, max_row=title_row)
        if text(data_sheet.cell(header_row, col).value).lower() != "level":
            raise MissingHeader(f"{data_sheet.title}: {key} table must start with a level column")
        columns = []
        c = col + 1
        while text(data_sheet.cell(header_row, c).value) in meta["stats"]:
            columns.append((c, text(data_sheet.cell(header_row, c).value)))
            c += 1
        if len(columns) != len(meta["stats"]):
            raise MissingHeader(f"{data_sheet.title}: {key} table has {[n for _, n in columns]}, expected {list(meta['stats'])}")
        levels = []
        row = header_row + 1
        while isinstance(number(data_sheet.cell(row, col).value), int):
            if number(data_sheet.cell(row, col).value) != len(levels) + 1:
                raise ValueError(f"{data_sheet.title} row {row}: {key} levels out of order")
            levels.append([(number(data_sheet.cell(row, c).value) or 0) / 100 for c, _ in columns])
            row += 1
        statues.append({
            "key": key.lower(),
            "name": meta["name"],
            "stats": [meta["stats"][label] for _, label in columns],
            "levels": levels,
        })

    art = {}
    images = images_by_cell(panel_sheet)
    for key, meta in STATUES.items():
        row, col = find_cell(panel_sheet, meta["name"])
        found = [data for (r, c), data in images.items() if c == col and row < r <= row + 4]
        if found:
            art[key.lower()] = found[0]
    return statues, art
