"""Stage Data and STAT TRACKER -> promotion bosses.

The workbook has no promotion boss table. STAT TRACKER's "Promotion
Recommended Stages" gives each promotion a recommended stage and a +/- range,
and Stage Data gives every stage's boss HP, so a promotion's boss is read as
the boss of its recommended stage.
"""

from optimizer.workbook import MissingHeader, find_cell, find_header_row, number, text


def extract_stage_bosses(stage_sheet):
    """Boss HP by stage number, index 0 = stage 1."""
    header_row, col = find_header_row(stage_sheet, ["NUMBER", "BOSS HP"])
    hp = []
    row = header_row + 1
    while row <= stage_sheet.max_row:
        stage = number(stage_sheet.cell(row, col["NUMBER"]).value)
        if isinstance(stage, int) and stage >= 1:
            if stage != len(hp) + 1:
                raise ValueError(f"{stage_sheet.title} row {row}: expected stage {len(hp) + 1}, found {stage}")
            hp.append(number(stage_sheet.cell(row, col["BOSS HP"]).value) or 0)
        row += 1
    if not hp:
        raise MissingHeader(f"{stage_sheet.title}: no stages under NUMBER")
    return hp


def extract_promotion_stages(tracker_sheet):
    """[{name, stage, range}] from STAT TRACKER's Promotion Recommended Stages table."""
    title_row, _ = find_cell(tracker_sheet, "Promotion Recommended Stages")
    header_row = title_row + 1
    columns = {}
    for c in range(1, tracker_sheet.max_column + 1):
        name = text(tracker_sheet.cell(header_row, c).value)
        if name in ("Promotion", "Recommended", "Recommended Stage +-") and name not in columns:
            columns[name] = c
    if len(columns) != 3:
        raise MissingHeader(f"{tracker_sheet.title} row {header_row}: Promotion / Recommended / Recommended Stage +- headers")
    promotions = []
    row = header_row + 1
    while text(tracker_sheet.cell(row, columns["Promotion"]).value):
        name = text(tracker_sheet.cell(row, columns["Promotion"]).value)
        if name.upper() == "MAX STAGE":
            break
        promotions.append({
            "name": name,
            "stage": number(tracker_sheet.cell(row, columns["Recommended"]).value) or 0,
            "range": number(tracker_sheet.cell(row, columns["Recommended Stage +-"]).value) or 0,
        })
        row += 1
    return promotions
