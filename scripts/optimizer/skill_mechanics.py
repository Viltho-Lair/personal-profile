"""Skills Data -> how each skill plays out in a fight.

The game's own columns say what a skill is (skillType), what triggers it
(activeType: seconds, basic-attack hits, always on) and how passives behave
(passiveType). "Hits with SM" and "SM AMP" are formulas that read Skill
Mastery checkboxes; they're kept as checkbox cells for the extractor to turn
into mastery node ids.
"""

import re

from optimizer.workbook import MissingHeader, header_columns, number, text

HEADERS = ["SKILL", "Id", "skillType", "activeType", "passiveType", "ActiveNeedValue", "Duration",
           "AdditionalValue__1", "AdditionalValue__2", "Hits with SM", "SM AMP"]

SKILL_TYPES = {0: "attack", 1: "buff", 2: "passive"}
TRIGGERS = {1: "always", 2: "seconds", 4: "hits", 5: "special"}
PASSIVES = {1: "stack", 2: "delayed"}

IF_CHECK = re.compile(
    r"IF\('SKILL MASTERY'!([A-Z]+)(\d+),\s*([\d.]+)"
    r"(?:\s*\*\s*IF\(SKILLS!I13\s*=\s*\"(\w+)\",\s*([\d.]+),\s*1\))?"
    r",\s*([\d.]+)\)"
)


def _formula(cell):
    value = getattr(cell.value, "text", cell.value)
    return value if isinstance(value, str) and value.startswith("=") else None


def _checks(formula):
    """[(cell, when checked, when not)] for each IF('SKILL MASTERY'!Xn, a, b) term.

    A term like IF(..., 3 * IF(SKILLS!I13 = "Boss", 1.2, 1), 1) is read for a
    boss fight: 3 x 1.2 when the target is "Boss", 3 otherwise.
    """
    found = []
    for col, row, checked, target, target_factor, unchecked in IF_CHECK.findall(formula):
        value = float(checked)
        if target == "Boss":
            value *= float(target_factor)
        found.append({"cell": f"{col}{row}", "checked": value, "unchecked": float(unchecked)})
    return found


def extract_skill_mechanics(values, formulas):
    """{skill name: mechanics} for every skill row with game data."""
    col = header_columns(values, 1, HEADERS)
    mechanics = {}
    row = 3
    while text(values.cell(row, col["SKILL"]).value):
        name = text(values.cell(row, col["SKILL"]).value)
        skill_type = number(values.cell(row, col["skillType"]).value)
        if skill_type is None:
            row += 1
            continue  # newer seasonal skills without game columns yet

        hits_formula = _formula(formulas.cell(row, col["Hits with SM"]))
        hits_value = number(values.cell(row, col["Hits with SM"]).value)
        hit_checks = _checks(hits_formula) if hits_formula else []
        if len(hit_checks) > 1:
            raise ValueError(f"{values.title} row {row}: {name} has more than one mastery hit check")
        hits = None
        if hit_checks:
            check = hit_checks[0]
            hits = {"base": check["unchecked"], "mastery": {"cell": check["cell"], "hits": check["checked"]}}
        elif hits_value:
            hits = {"base": hits_value, "mastery": None}

        amp_formula = _formula(formulas.cell(row, col["SM AMP"]))
        amps = [
            {"cell": check["cell"], "multiplier": check["checked"] / check["unchecked"]}
            for check in (_checks(amp_formula) if amp_formula else [])
        ]
        if amp_formula and not amps:
            raise MissingHeader(f"{values.title} row {row}: couldn't read {name}'s SM AMP formula {amp_formula!r}")

        mechanics[name] = {
            "type": SKILL_TYPES.get(skill_type),
            "trigger": TRIGGERS.get(number(values.cell(row, col["activeType"]).value), "special"),
            "passive": PASSIVES.get(number(values.cell(row, col["passiveType"]).value)),
            "every": number(values.cell(row, col["ActiveNeedValue"]).value),
            "duration": number(values.cell(row, col["Duration"]).value) or 0,
            "additional": [
                number(values.cell(row, col["AdditionalValue__1"]).value) or 0,
                number(values.cell(row, col["AdditionalValue__2"]).value) or 0,
            ],
            "hits": hits,
            "masteryDamage": amps,
        }
        row += 1
    return mechanics
