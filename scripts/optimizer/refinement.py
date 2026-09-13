"""SKILLS -> Skill Refinement: which skills refine, and each one's owned effect.

The SKILLS sheet lays refinable skills out in blocks of four columns (skill
name, "Refinement Effect" rows, then "Owned Effects" with the owned stat and a
dropdown of its four values). The option value ranges per colour come from the
game's Refinement Effect screen, which the workbook doesn't carry.
"""

from openpyxl.utils import get_column_letter, range_boundaries

from optimizer.workbook import MissingHeader, find_cell, text

# Colour tiers, White ... Aqua; the last is the "mythic" colour that owned effects count.
TIERS = ["White", "Green", "Orange", "Purple", "Red", "Aqua"]
OPTIONS = {
    "Cooldown Reduction(%)": [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6], [0.7, 0.9], [1.0, 1.2], [1.3, 2.0]],
    "Reduction in Required Strikes(%)": [[0.1, 0.3], [0.4, 0.6], [0.7, 0.9], [1.0, 1.3], [1.4, 1.8], [1.9, 3.0]],
    "DMG Increase(%)": [[1, 3], [3, 5], [5, 7], [7, 10], [10, 13], [13, 20]],
    "Mana Consumption Reduction(%)": [[0.1, 0.3], [0.4, 0.6], [0.7, 0.9], [1.0, 1.2], [1.3, 1.5], [1.6, 3.0]],
    "DMG dealt to attribute enemies(%)": [[1, 4], [4, 7], [7, 10], [10, 14], [14, 19], [19, 25]],
    "DMG Resist while equipped(%)": [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6], [0.7, 0.8], [0.9, 1.0], [1.1, 1.5]],
    "Accuracy for this skill while equipped": [[5, 15], [15, 25], [25, 35], [35, 50], [50, 65], [65, 100]],
}
# Refinement lines by skill grade.
LINES = {"Common": 3, "Great": 4}
DEFAULT_LINES = 5
NAME_COLUMNS = 4  # blocks start in D, I, M, Q


def _dropdowns(sheet):
    """{cell: [values]} for every list-type data validation."""
    found = {}
    for validation in sheet.data_validations.dataValidation:
        formula = validation.formula1 or ""
        if not formula.startswith('"'):
            continue
        items = formula.strip('"').split(",")
        for ref in str(validation.sqref).split():
            min_col, min_row, max_col, max_row = range_boundaries(ref)
            for row in range(min_row, max_row + 1):
                for col in range(min_col, max_col + 1):
                    found[f"{get_column_letter(col)}{row}"] = items
    return found


def _owned_values(items):
    percent = all(item.endswith("%") for item in items)
    values = [float(item.rstrip("%")) for item in items]
    return ([round(v / 100, 6) for v in values] if percent else values), percent


def extract_refinement(sheet, skills_by_name):
    """{options, tiers, skills: [{name, lines, owned: {stat, values, percent}}]}."""
    title_row, _ = find_cell(sheet, "SKILL REFINEMENT")
    dropdowns = _dropdowns(sheet)
    skills = []
    row = title_row
    while row <= sheet.max_row:
        for col in range(1, sheet.max_column + 1):
            if text(sheet.cell(row, col).value) != "Refinement Effect":
                continue
            name = text(sheet.cell(row - 2, col).value)
            if not name:
                continue
            if name not in skills_by_name:
                raise ValueError(f"{sheet.title} {get_column_letter(col)}{row - 2}: refinement for unknown skill {name!r}")
            owned_row = row + 1
            while text(sheet.cell(owned_row, col).value) != "Owned Effects":
                owned_row += 1
                if owned_row > row + 10:
                    raise MissingHeader(f"{sheet.title}: no Owned Effects under {name}")
            stat = text(sheet.cell(owned_row + 1, col).value)
            items = dropdowns.get(f"{get_column_letter(col + 2)}{owned_row + 1}")
            if not items:
                raise MissingHeader(f"{sheet.title}: no owned effect values for {name}")
            values, percent = _owned_values(items)
            skills.append({
                "name": name,
                "lines": LINES.get(skills_by_name[name]["grade"], DEFAULT_LINES),
                "owned": {"stat": stat, "values": values, "percent": percent},
            })
        row += 1
    if not skills:
        raise MissingHeader(f"{sheet.title}: no refinable skills under SKILL REFINEMENT")
    return {"tiers": TIERS, "options": OPTIONS, "skills": skills}
