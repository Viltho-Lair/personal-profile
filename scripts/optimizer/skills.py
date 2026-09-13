"""Skills Data -> skill records and icons."""

from optimizer.workbook import (
    MissingHeader,
    header_columns,
    images_by_cell,
    largest_image_on_row,
    number,
    rows_until_blank,
    text,
)

ELEMENTS = {1: "Fire", 2: "Water", 3: "Wind", 4: "Earth"}

# CURRENT LEVEL is located only to bound the icon search; its values are the
# workbook owner's account and are never read.
HEADERS = [
    "SKILL", "CURRENT LEVEL", "SKILL BASIC DESCRIPTION", "SKILL SPECIFIC DESCRIPTION",
    "Tier", "Id", "dmgType", "MaxLevel", "MpCost", "InitValue", "upgradeValue",
    "ActiveNeedValue", "Range", "Duration",
]
PLACEHOLDER = "Locked"


def extract_skills(sheet):
    """Return (skills, icons); icons maps skill id to image bytes."""
    col = header_columns(sheet, 1, HEADERS)
    images = images_by_cell(sheet)
    skills, icons = [], {}

    for row in rows_until_blank(sheet, 2, col["SKILL"]):
        name = text(sheet.cell(row, col["SKILL"]).value)
        if name == PLACEHOLDER:
            continue

        def value(header, row=row):
            return number(sheet.cell(row, col[header]).value)

        skill_id = value("Id")
        max_level = value("MaxLevel")
        if skill_id is None or max_level is None:
            raise MissingHeader(f"{sheet.title} row {row}: {name!r} has no Id or MaxLevel")

        skills.append({
            "id": skill_id,
            "name": name,
            "element": ELEMENTS.get(value("dmgType") or 0),
            "grade": text(sheet.cell(row, col["Tier"]).value),
            "maxLevel": max_level,
            "mpCost": value("MpCost"),
            "baseValue": value("InitValue"),
            "upgradeValue": value("upgradeValue"),
            "cooldown": value("ActiveNeedValue"),
            "range": value("Range"),
            "duration": value("Duration"),
            "description": {
                "basic": text(sheet.cell(row, col["SKILL BASIC DESCRIPTION"]).value),
                "specific": text(sheet.cell(row, col["SKILL SPECIFIC DESCRIPTION"]).value),
            },
        })

        icon = largest_image_on_row(images, row, col["SKILL"], col["CURRENT LEVEL"] - 1)
        if icon is not None:
            icons[skill_id] = icon

    return skills, icons
