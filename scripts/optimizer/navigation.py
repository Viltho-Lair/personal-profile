"""HOME -> the section icons above the CHARACTER / SKILLS / EQUIPMENT / COMPANIONS titles."""

from optimizer.workbook import MissingHeader, images_by_cell, text

SECTIONS = {"CHARACTER": "char", "SKILLS": "skill", "EQUIPMENT": "equips", "COMPANIONS": "companion"}


def extract_navigation_icons(home):
    """{tab id: image bytes} for each section title that has art in the row above it."""
    images = images_by_cell(home)
    icons = {}
    for row in home.iter_rows():
        for cell in row:
            tab = SECTIONS.get(text(cell.value) or "")
            if tab and tab not in icons:
                data = images.get((cell.row - 1, cell.column))
                if data is not None:
                    icons[tab] = data
    missing = sorted(set(SECTIONS.values()) - set(icons))
    if missing:
        raise MissingHeader(f"{home.title}: no section icon for {missing}")
    return icons
