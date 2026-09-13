"""Tree Data -> the Memory Tree: main nodes, their sub nodes and tree levels.

The sheet holds the game's three raw tables side by side on row 2:
  - ImmortalTreeSubNodeData (Id, NeedTreeLevel, MainNodeIndex, NodeNumber, ...)
  - ImmortalTreeMainNodeData (Id, NeedNodeNumberRequired__001..003)
  - ImmortalTreeUpgradeData (Id, level, TreeGrade, NeedTotalNodeUpgrade, BuffType__00n, Value__00n)
and buff icons beside their names further right (Cube, Dice, ...).
"""

from optimizer.workbook import MissingHeader, find_cell, images_by_cell, number, slug, text

SUB = ["NeedTreeLevel", "MainNodeIndex", "NodeNumber", "NeedNodeNumber__001", "NeedNodeNumber__002",
       "NeedNodeNumber__003", "NodeType", "MaxLevel", "BuffType", "BuffGameModeType", "Value %",
       "MaterialAmount__001", "RewardType", "RewardAmount"]
MAIN = ["NeedNodeNumberRequired__001", "NeedNodeNumberRequired__002", "NeedNodeNumberRequired__003"]
UPGRADE = ["level", "TreeGrade", "NeedTotalNodeUpgrade", "BuffType__001", "BuffType__002", "BuffType__003",
           "Value__001", "Value__002", "Value__003"]
REWARD_NODE = 2


def _columns(sheet, row, names, start=1):
    found = {}
    for c in range(start, sheet.max_column + 1):
        name = text(sheet.cell(row, c).value)
        if name in names and name not in found:
            found[name] = c
    missing = [n for n in names if n not in found]
    if missing:
        raise MissingHeader(f"{sheet.title} row {row}: missing headers {missing}")
    return found


def _rows(sheet, first_row, id_col):
    row = first_row
    while isinstance(number(sheet.cell(row, id_col).value), int):
        yield row
        row += 1


def extract_memory_tree(sheet):
    """Return (tree, icons); icons maps a buff name's slug to image bytes."""
    header_row, _ = find_cell(sheet, "NeedTreeLevel", max_row=5)
    sub = _columns(sheet, header_row, SUB)
    sub_id = sub["NeedTreeLevel"] - 1
    main = _columns(sheet, header_row, MAIN)
    main_id = main[MAIN[0]] - 1
    upgrade = _columns(sheet, header_row, UPGRADE)
    upgrade_id = upgrade["level"] - 1
    if not all(text(sheet.cell(header_row, c).value) == "Id" for c in (sub_id, main_id, upgrade_id)):
        raise MissingHeader(f"{sheet.title} row {header_row}: each table must start with an Id column")

    def value(row, col):
        return number(sheet.cell(row, col).value)

    nodes = []
    for row in _rows(sheet, header_row + 1, main_id):
        needs = [value(row, main[name]) for name in MAIN]
        nodes.append({"id": value(row, main_id), "requires": [n for n in needs if n], "subNodes": []})
    by_id = {node["id"]: node for node in nodes}

    for row in _rows(sheet, header_row + 1, sub_id):
        main_index = value(row, sub["MainNodeIndex"])
        if main_index not in by_id:
            raise ValueError(f"{sheet.title} row {row}: sub node belongs to unknown main node {main_index}")
        reward = value(row, sub["NodeType"]) == REWARD_NODE
        needs = [value(row, sub[name]) for name in ("NeedNodeNumber__001", "NeedNodeNumber__002", "NeedNodeNumber__003")]
        by_id[main_index]["subNodes"].append({
            "id": value(row, sub_id),
            "number": value(row, sub["NodeNumber"]),
            "requiresTreeLevel": value(row, sub["NeedTreeLevel"]),
            "requires": [n for n in needs if n],
            "maxLevel": value(row, sub["MaxLevel"]),
            "buff": None if reward else text(sheet.cell(row, sub["BuffType"]).value),
            "mode": None if reward else text(sheet.cell(row, sub["BuffGameModeType"]).value),
            "valuePerLevel": None if reward else value(row, sub["Value %"]),
            "costPerLevel": value(row, sub["MaterialAmount__001"]) or 0,
            "reward": {"type": text(sheet.cell(row, sub["RewardType"]).value), "amount": value(row, sub["RewardAmount"])}
            if reward else None,
        })

    levels = []
    for row in _rows(sheet, header_row + 1, upgrade_id):
        buffs = []
        for n in ("001", "002", "003"):
            buff_type = value(row, upgrade[f"BuffType__{n}"])
            amount = value(row, upgrade[f"Value__{n}"])
            if buff_type:
                buffs.append({"type": buff_type, "value": amount})
        levels.append({
            "level": value(row, upgrade["level"]),
            "grade": value(row, upgrade["TreeGrade"]),
            "needsSubNodeLevels": value(row, upgrade["NeedTotalNodeUpgrade"]),
            "buffs": buffs,
        })

    images = images_by_cell(sheet)
    icons = {}
    for (r, c), data in images.items():
        name = text(sheet.cell(r, c - 1).value)
        if name:
            icons[slug(name)] = data
    return {"mainNodes": nodes, "levels": levels}, icons
