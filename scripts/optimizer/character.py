"""CHARACTER, Character Data and Equipment Data -> the Character tab's tables.

  - enhance stats and their max levels (CHARACTER rows under "CURRENT LVL")
  - Growing Knowledge / Superhuman grades (Character Data "GROWTH KNOWLEDGE")
  - growth stats and their base bonus per level (CHARACTER "GROWTH")
  - Awakened Latent Power multipliers (Character Data "AWAKEN LATENT POWER")
  - promotions with their bonuses (Character Data "PROMOTION" tables)
  - promotion additional ability options and their values ("ABILITY OPTIONS")
  - classes and their multipliers (Equipment Data "CLASSES")
"""

import re

from optimizer.workbook import MissingHeader, find_cell, number, rows_until_blank, text

GROWTH_REF = re.compile(r"^=\s*[A-Z]+\d+\s*(?:\*\s*(?:'[^']+'!)?\$?([A-Z]+)\$?(\d+)|\*\s*(\d+(?:\.\d+)?))?\s*(?:/\s*(\d+))?\s*$")


def _enhance(character, values_character):
    header_row, level_col = find_cell(character, "CURRENT LVL")
    _, max_col = find_cell(character, "MAX LVL", min_row=header_row, max_row=header_row)
    stats = []
    previous = None
    for row in range(header_row + 1, header_row + 12):
        label = character.cell(row, 3).value
        if isinstance(label, bool) and previous == "DEATH STRIKE":
            label = "DEATH STRIKE %"  # the sheet puts a checkbox where this label would be
        label = text(label) if not isinstance(label, bool) else None
        if not label or number(values_character.cell(row, level_col).value) is None:
            continue
        cap = character.cell(row, max_col).value
        entry = {"name": label, "maxLevel": number(values_character.cell(row, max_col).value)}
        if isinstance(cap, str) and cap.startswith("=") and "1000" in cap:
            # Death Strike stats open once CRIT % is maxed; Death Strike's cap then
            # comes from Growing Knowledge + Superhuman, Death Strike %'s is 1000.
            entry["maxLevel"] = None
            entry["requiresCrit"] = 1000
            entry["cap"] = "growingKnowledge" if "VLOOKUP" in cap.upper() else 1000
        stats.append(entry)
        previous = label
    if not stats:
        raise MissingHeader(f"{character.title}: no enhance stats under 'CURRENT LVL'")
    return stats


def _growing_knowledge(data):
    title_row, title_col = find_cell(data, "GROWTH KNOWLEDGE", max_row=1)
    header = title_row + 1
    expected = ["Grade", "COMBINED VALUE", "SINGLE VALUE", "MAX DSD LVL", "SUPERHUMAN"]
    if [text(data.cell(header, title_col + i).value) for i in range(5)] != expected:
        raise MissingHeader(f"{data.title}: GROWTH KNOWLEDGE headers are not {expected}")
    grades = []
    for row in rows_until_blank(data, header + 1, title_col):
        grades.append({
            "grade": text(data.cell(row, title_col).value),
            "atk": number(data.cell(row, title_col + 1).value) or 0,
            "maxDeathStrike": number(data.cell(row, title_col + 3).value),
            "superhuman": number(data.cell(row, title_col + 4).value) or 0,
        })
    return grades


def _growth(character_formulas, data):
    title_row, _ = find_cell(character_formulas, "GROWTH")
    header_row, level_col = find_cell(character_formulas, "CURRENT LVL", min_row=title_row)
    _, bonus_col = find_cell(character_formulas, "BASE BONUS", min_row=header_row, max_row=header_row)
    stats = []
    for row in range(header_row + 1, header_row + 16):
        label = text(character_formulas.cell(row, 5).value)
        formula = character_formulas.cell(row, bonus_col).value
        if not label or not isinstance(formula, str):
            continue
        match = GROWTH_REF.match(formula.replace(" ", ""))
        if not match:
            raise ValueError(f"{character_formulas.title} row {row}: growth bonus is not level x amount: {formula!r}")
        ref_col, ref_row, literal, divisor = match.groups()
        if ref_col:
            amount = number(data[f"{ref_col}{ref_row}"].value)
        else:
            amount = float(literal) if literal else 1
        if divisor:
            amount = amount / float(divisor)
        key, _, detail = label.partition(" ")
        stats.append({"key": key, "detail": detail.strip(" ()") or None, "perLevel": amount})
    return stats


def _latent_awakening(data):
    title_row, title_col = find_cell(data, "AWAKEN LATENT POWER")
    header = title_row + 2
    if text(data.cell(header, title_col).value) != "GRADE":
        raise MissingHeader(f"{data.title}: AWAKEN LATENT POWER table must start with GRADE")

    def table(col):
        rows = []
        row = header + 1
        while isinstance(number(data.cell(row, col).value), int):
            rows.append({
                "grade": number(data.cell(row, col).value),
                "level": number(data.cell(row, col + 1).value),
                "multiplier": number(data.cell(row, col + 3).value),
            })
            row += 1
        return rows

    return {"stats": table(title_col), "crit": table(title_col + 4)}


def _promotions(data):
    tables = []
    row = 1
    while row <= data.max_row:
        try:
            title_row, bonus_col = find_cell(data, "ATK / HP BONUS", min_row=row, max_col=12)
        except MissingHeader:
            break
        title_col = next((c for c in range(1, bonus_col) if text(data.cell(title_row, c).value) == "PROMOTION"), None)
        if title_col is None:
            raise MissingHeader(f"{data.title} row {title_row}: no PROMOTION header beside ATK / HP BONUS")
        headers = {text(data.cell(title_row, c).value): c for c in range(title_col, title_col + 10) if text(data.cell(title_row, c).value)}
        rows = {}
        for r in rows_until_blank(data, title_row + 1, title_col):
            name = text(data.cell(r, title_col).value)
            rows[name] = {h: number(data.cell(r, c).value) for h, c in headers.items() if h != "PROMOTION"}
        tables.append(rows)
        row = title_row + 1
    if not tables:
        raise MissingHeader(f"{data.title}: no PROMOTION tables")

    # The tables list the same promotions in the same order but not always the same
    # spelling ("Eisenhart" / "Eisenhardt"), so they are merged by position.
    if any(len(table) != len(tables[0]) for table in tables):
        raise ValueError(f"{data.title}: PROMOTION tables list different numbers of promotions")
    promotions = []
    for index, name in enumerate(tables[0]):
        merged = {}
        for table in tables:
            merged.update(list(table.values())[index])
        promotions.append({
            "number": index + 1,
            "name": name,
            "atkHpBonus": merged.get("ATK / HP BONUS"),
            "extraAtk": merged.get("Extra ATK(%)"),
            "monsterGold": merged.get("Monster Gold(%)"),
            "extraExp": merged.get("Extra EXP(%)"),
            "extraHp": merged.get("Extra HP(%)"),
        })
    return promotions


def _ability_options(data):
    title_row, title_col = find_cell(data, "ABILITY OPTIONS", max_row=1)
    header = title_row + 1
    options = []
    col = title_col
    while (name := text(data.cell(header, col).value)) is not None:
        values = []
        row = header + 1
        while isinstance((value := number(data.cell(row, col).value)), (int, float)) and not isinstance(value, bool):
            values.append(value)
            row += 1
        options.append({"name": name, "values": values})
        col += 1
    return options


def _classes(equipment_data):
    title_row, title_col = find_cell(equipment_data, "CLASSES", max_col=1)
    header = title_row + 1
    if [text(equipment_data.cell(header, title_col + i).value) for i in (0, 2)] != ["TYPE", "MULTIPLIER"]:
        raise MissingHeader(f"{equipment_data.title}: CLASSES table must have TYPE and MULTIPLIER")
    return [
        {"name": text(equipment_data.cell(r, title_col).value), "multiplier": number(equipment_data.cell(r, title_col + 2).value)}
        for r in rows_until_blank(equipment_data, header + 1, title_col)
    ]


def extract_character(character_formulas, character_values, data_values, equipment_values):
    return {
        "enhance": _enhance(character_formulas, character_values),
        "growingKnowledge": _growing_knowledge(data_values),
        "growth": _growth(character_formulas, data_values),
        "latentAwakening": _latent_awakening(data_values),
        "promotions": _promotions(data_values),
        "abilityOptions": _ability_options(data_values),
        "classes": _classes(equipment_values),
    }
