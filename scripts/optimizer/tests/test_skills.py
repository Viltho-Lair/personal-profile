import unittest

from optimizer.skills import extract_skills
from optimizer.tests.support import build_sheet
from optimizer.workbook import MissingHeader, image_size

HEADERS = {
    "A1": "SKILL", "D1": "CURRENT LEVEL", "E1": "SKILL BASIC DESCRIPTION",
    "F1": "SKILL SPECIFIC DESCRIPTION", "G1": "Tier", "H1": "Id", "J1": "dmgType",
    "M1": "MaxLevel", "T1": "MpCost", "U1": "InitValue", "V1": "upgradeValue",
    "W1": "ActiveNeedValue", "X1": "Range", "Y1": "Duration",
}
LOCKED = {"A2": "Locked", "H2": "Locked"}
FIRE_SLASH = {
    "A3": "Fire Slash", "D3": 99, "E3": "Wrap fire around the sword",
    "F3": "Attack with X% of ATK", "G3": "Common", "H3": 1.0, "J3": 1.0,
    "M3": 250.0, "T3": 25.0, "U3": 400.0, "V3": 40.0, "W3": 12.0, "X3": 3.0, "Y3": 0.0,
}
RAVE = {
    "A4": "Rave", "D4": 0, "E4": "Additional damage", "F4": "Deals X%",
    "G4": "Immortal", "H4": 45.0, "J4": 0.0, "M4": 5.0, "T4": 50.0,
    "U4": 70.0, "V4": 10.0, "W4": 60.0, "X4": 6.0, "Y4": 0.0,
}


def skills_sheet(**overrides):
    cells = {**HEADERS, **LOCKED, **FIRE_SLASH, **RAVE, **overrides}
    return build_sheet({k: v for k, v in cells.items() if v is not None}, title="Skills Data",
                       images=[("B3", 64), ("C3", 128)])


class ExtractSkills(unittest.TestCase):
    def test_reads_game_fields(self):
        skills, _ = extract_skills(skills_sheet())
        self.assertEqual(skills[0], {
            "id": 1, "name": "Fire Slash", "element": "Fire", "grade": "Common",
            "category": "core", "maxLevel": 250, "mpCost": 25, "baseValue": 400, "upgradeValue": 40,
            "cooldown": 12, "range": 3, "duration": 0,
            "description": {"basic": "Wrap fire around the sword", "specific": "Attack with X% of ATK"},
        })

    def test_skips_the_locked_row_and_stops_at_a_blank_row(self):
        skills, _ = extract_skills(skills_sheet())
        self.assertEqual([s["name"] for s in skills], ["Fire Slash", "Rave"])

    def test_element_code_zero_means_no_element(self):
        skills, _ = extract_skills(skills_sheet())
        self.assertIsNone(skills[1]["element"])

    def test_category_is_core_seasonal_or_immortal(self):
        seasonal = {
            "A5": "Rekindle", "G5": "Common", "H5": 1018.0, "J5": 1.0, "M5": 20.0,
        }
        skills, _ = extract_skills(skills_sheet(**seasonal))
        self.assertEqual(
            [(s["name"], s["category"]) for s in skills],
            [("Fire Slash", "core"), ("Rave", "immortal"), ("Rekindle", "seasonal")],
        )

    def test_never_reads_the_players_current_level(self):
        skills, _ = extract_skills(skills_sheet())
        self.assertNotIn(99, skills[0].values())

    def test_missing_header_is_named(self):
        with self.assertRaisesRegex(MissingHeader, "ActiveNeedValue"):
            extract_skills(skills_sheet(W1=None))

    def test_icon_is_the_largest_image_on_the_row(self):
        _, icons = extract_skills(skills_sheet())
        self.assertEqual(image_size(icons[1]), (128, 128))
        self.assertNotIn(45, icons)

    def test_a_skill_without_max_level_stops_extraction(self):
        with self.assertRaisesRegex(MissingHeader, "Fire Slash"):
            extract_skills(skills_sheet(M3=None))


if __name__ == "__main__":
    unittest.main()
