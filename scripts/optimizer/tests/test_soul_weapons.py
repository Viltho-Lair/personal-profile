import unittest

from optimizer.soul_weapons import extract_soul_weapons, split_requirement
from optimizer.tests.support import build_sheet
from optimizer.workbook import MissingHeader, image_size


def equipment_data(**overrides):
    cells = {
        "X1": "SOUL WEAPONS",
        "X2": "NAME", "Y2": "ICON", "Z2": "SOUL COLOR", "AA2": "REQUIREMENTS",
        "AC2": "ATTACK", "AD2": "STAGE REQUIREMENT", "AF2": "Engraving ATK", "AG2": "Engraving HP",
        "X3": "None", "AA3": 0.0, "AC3": 0.0,
        "X4": "Innocence", "Z4": "GREEN", "AA4": 2000.0, "AB4": "Steel Sword\nGrade 1",
        "AC4": 6300.0, "AD4": 80.0, "AE4": "Black Forest", "AF4": 1.0, "AG4": 1.0,
        "X5": "Silence 1840", "Z5": "RED", "AA5": 3000.0, "AC5": 9000.0, "AD5": 1200.0,
        **overrides,
    }
    return build_sheet({k: v for k, v in cells.items() if v is not None},
                       title="Equipment Data", images=[("Y4", 128)])


class SplitRequirement(unittest.TestCase):
    def test_grade_on_its_own_line_or_appended(self):
        self.assertEqual(split_requirement("Steel Sword\nGrade 1"), ("Steel Sword", "Grade 1"))
        self.assertEqual(split_requirement("Cold Blade Grade 4"), ("Cold Blade", "Grade 4"))
        self.assertEqual(split_requirement(None), (None, None))


class ExtractSoulWeapons(unittest.TestCase):
    def test_reads_a_soul_weapon(self):
        weapons, _ = extract_soul_weapons(equipment_data())
        self.assertEqual(weapons[0], {
            "id": 1, "name": "Innocence", "soulColor": "GREEN", "attack": 6300,
            "cost": 2000, "disassemblyReward": 1000,
            "requirement": {"item": "Steel Sword", "grade": "Grade 1"},
            "stage": {"number": 80, "name": "Black Forest"},
            "engraving": {"atk": 1, "hp": 1},
        })

    def test_skips_the_none_placeholder(self):
        weapons, _ = extract_soul_weapons(equipment_data())
        self.assertEqual([(w["id"], w["name"]) for w in weapons], [(1, "Innocence"), (2, "Silence 1840")])

    def test_missing_requirement_and_stage_name_become_none(self):
        silence = extract_soul_weapons(equipment_data())[0][1]
        self.assertEqual(silence["requirement"], {"item": None, "grade": None})
        self.assertEqual(silence["stage"], {"number": 1200, "name": None})

    def test_icons_come_from_the_icon_column(self):
        _, icons = extract_soul_weapons(equipment_data())
        self.assertEqual(image_size(icons["Innocence"]), (128, 128))

    def test_missing_header_is_named(self):
        with self.assertRaisesRegex(MissingHeader, "Engraving HP"):
            extract_soul_weapons(equipment_data(AG2=None))


if __name__ == "__main__":
    unittest.main()
