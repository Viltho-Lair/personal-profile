"""Relics: names and buffs from EQUIPMENT, level bands from Equipment Data.

Equipment Data misspells some names ("Strength Glove", "Emporer Ring"), so
display names come from the EQUIPMENT sheet. The two lists share an order,
which is checked by name similarity before bands are attached.
"""

import re
from difflib import SequenceMatcher

from optimizer.workbook import (
    find_cell,
    find_header_row,
    header_columns,
    images_by_cell,
    normalise,
    rows_until_blank,
    text,
)

BAND = re.compile(r"<\s*(\d+)\s*,\s*([\d.]+)")
FINAL = re.compile(r",\s*([\d.]+)\s*\)+\s*$")
MAX_LEVEL = re.compile(r"\s*Max\s*Level\s*(\d+)\s*$", re.IGNORECASE)
BUFF_VALUE = re.compile(r"\s*\+\s*[\d.,]*\s*%?\s*$")
MIN_NAME_SIMILARITY = 0.8


def parse_bands(formula):
    """Level bands from a nested IF(level<N, factor, ...) formula.

    A plain number is a flat factor that applies at every level.
    """
    if isinstance(formula, (int, float)) and not isinstance(formula, bool):
        return [{"from": 0, "to": None, "factor": float(formula)}]

    source = formula if isinstance(formula, str) else ""
    thresholds = [(int(limit), float(factor)) for limit, factor in BAND.findall(source)]
    final = FINAL.search(source)
    if not thresholds or final is None:
        raise ValueError(f"relic multiplier is not a level band formula: {formula!r}")

    bands, start = [], 0
    for limit, factor in thresholds:
        bands.append({"from": start, "to": limit - 1, "factor": factor})
        start = limit
    bands.append({"from": start, "to": None, "factor": float(final.group(1))})
    return bands


def _relic_block(sheet):
    """Rows of the EQUIPMENT relic block, which skips a row between relics."""
    header_row, col = find_header_row(sheet, ["ICON", "RELIC", "BONUS"])
    entries, blanks, row = [], 0, header_row + 1
    while blanks <= 2:
        raw = text(sheet.cell(row, col["RELIC"]).value)
        if raw is None:
            blanks += 1
        else:
            blanks = 0
            match = MAX_LEVEL.search(raw)
            if match is None:
                break
            bonus = text(sheet.cell(row, col["BONUS"]).value) or ""
            entries.append({
                "row": row,
                "name": MAX_LEVEL.sub("", raw),
                "maxLevel": int(match.group(1)),
                "buff": BUFF_VALUE.sub("", bonus) or None,
                # "Extra Dmg +0%" is a percentage; "Accuracy Rate +0" is flat.
                "percent": bonus.rstrip().endswith("%"),
            })
        row += 1
    return entries, col["ICON"]


def extract_relics(equipment_sheet, data_formula_sheet):
    entries, icon_col = _relic_block(equipment_sheet)

    title_row, title_col = find_cell(data_formula_sheet, "RELICS")
    col = header_columns(data_formula_sheet, title_row + 1, ["RELIC", "MULTIPLIER"], min_col=title_col)
    data_rows = list(rows_until_blank(data_formula_sheet, title_row + 2, col["RELIC"]))

    if len(data_rows) != len(entries):
        raise ValueError(
            f"EQUIPMENT lists {len(entries)} relics but Equipment Data lists {len(data_rows)}"
        )

    images = images_by_cell(equipment_sheet)
    relics, icons = [], {}
    for index, (entry, data_row) in enumerate(zip(entries, data_rows)):
        data_name = text(data_formula_sheet.cell(data_row, col["RELIC"]).value)
        similarity = SequenceMatcher(None, normalise(entry["name"]), normalise(data_name)).ratio()
        if similarity < MIN_NAME_SIMILARITY:
            raise ValueError(
                f"relic {index}: EQUIPMENT says {entry['name']!r} but Equipment Data says {data_name!r}"
            )

        relics.append({
            "id": index,
            "name": entry["name"],
            "buff": entry["buff"],
            "percent": entry["percent"],
            "maxLevel": entry["maxLevel"],
            "bands": parse_bands(data_formula_sheet.cell(data_row, col["MULTIPLIER"]).value),
        })
        icon = images.get((entry["row"], icon_col))
        if icon is not None:
            icons[entry["name"]] = icon

    return relics, icons
