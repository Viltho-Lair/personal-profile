"""Black Orb Data -> orb level buffs, resonance and awakening multipliers.

GATCHA DATA lists per orb level a BuffType (1 boss damage, 2 monster damage)
and BuffValue in percent. The Black Orb Resonance table gives cumulative HP,
ATK and all-attribute amps (percent) by the sum of accessory levels. The
awakening table maps the total "+" levels on an accessory's lines to the
percent of its top stat added.
"""

from optimizer.workbook import MissingHeader, find_cell, header_columns, number

BUFF_TYPES = {1: "boss", 2: "monster"}


def extract_black_orb(sheet):
    header_row, _ = find_cell(sheet, "GachaLevel")
    gacha = header_columns(sheet, header_row, ["GachaLevel", "BuffType", "BuffValue"])
    buffs = []
    row = header_row + 1
    while number(sheet.cell(row, gacha["GachaLevel"]).value) is not None:
        kind = BUFF_TYPES.get(number(sheet.cell(row, gacha["BuffType"]).value))
        value = number(sheet.cell(row, gacha["BuffValue"]).value) or 0
        if kind and value:
            buffs.append({"level": number(sheet.cell(row, gacha["GachaLevel"]).value), "type": kind, "value": value})
        row += 1
    if not buffs:
        raise MissingHeader(f"{sheet.title}: no orb level buffs under GachaLevel")

    _, reso_col = find_cell(sheet, "Black Orb Resonance", max_row=header_row)
    reso = header_columns(sheet, header_row, ["Level", "HP SUM", "ATK SUM", "ALL SUM"], min_col=reso_col)
    resonance = []
    row = header_row + 1
    while number(sheet.cell(row, reso["Level"]).value) is not None:
        resonance.append({
            "levels": number(sheet.cell(row, reso["Level"]).value),
            "hp": number(sheet.cell(row, reso["HP SUM"]).value) or 0,
            "atk": number(sheet.cell(row, reso["ATK SUM"]).value) or 0,
            "all": number(sheet.cell(row, reso["ALL SUM"]).value) or 0,
        })
        row += 1
    if not resonance:
        raise MissingHeader(f"{sheet.title}: empty Black Orb Resonance table")

    awaken_row, awaken_col = find_cell(sheet, "Top stat bonus %")
    awakening = []
    row = awaken_row + 2
    while number(sheet.cell(row, awaken_col).value) is not None:
        awakening.append([number(sheet.cell(row, awaken_col).value), number(sheet.cell(row, awaken_col + 1).value) or 0])
        row += 1
    if not awakening:
        raise MissingHeader(f"{sheet.title}: empty awakening table under 'Top stat bonus %'")

    return {"buffs": buffs, "resonance": resonance, "awakening": awakening}
