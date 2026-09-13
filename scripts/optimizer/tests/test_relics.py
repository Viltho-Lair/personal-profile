import unittest

from optimizer.relics import extract_relics, parse_bands
from optimizer.tests.support import build_sheet
from optimizer.workbook import image_size

FORMULA = (
    "=IF(EQUIPMENT!E73<10,0.05, IF(EQUIPMENT!E73<20,0.055, IF(EQUIPMENT!E73<30,0.06, "
    "IF(EQUIPMENT!E73<40,0.065, IF(EQUIPMENT!E73<50,0.07, IF(EQUIPMENT!E73<60,0.08, "
    "IF(EQUIPMENT!E73<70,0.1, IF(EQUIPMENT!E73<80,0.12, IF(EQUIPMENT!E73<90,0.15, "
    "IF(EQUIPMENT!E73<100,0.18,0.22))))))))))"
)
SHORT = "=IF(EQUIPMENT!E75<10,0.005,0.04)"


def equipment(**overrides):
    cells = {
        "C72": "ICON", "D72": "RELIC", "E72": "LEVEL", "F72": "BONUS",
        "D73": "Strength Gloves Max Level 100", "E73": 55, "F73": "Extra Dmg +0%",
        "D75": "Emperor Ring Max Level 100", "E75": 0, "F75": "Earth Dmg +0%",
        "M76": "Unrelated block",
        **overrides,
    }
    return build_sheet({k: v for k, v in cells.items() if v is not None},
                       title="EQUIPMENT", images=[("C73", 64)])


def equipment_data(**overrides):
    cells = {
        "W136": "RELICS", "W137": "RELIC", "X137": "LEVEL", "AA137": "MULTIPLIER",
        "W138": "Strength Glove", "AA138": FORMULA,
        "W139": "Emporer Ring", "AA139": SHORT,
        **overrides,
    }
    return build_sheet({k: v for k, v in cells.items() if v is not None}, title="Equipment Data")


class ParseBands(unittest.TestCase):
    def test_reads_every_band_from_the_formula(self):
        bands = parse_bands(FORMULA)
        self.assertEqual(len(bands), 11)
        self.assertEqual(bands[0], {"from": 0, "to": 9, "factor": 0.05})
        self.assertEqual(bands[7], {"from": 70, "to": 79, "factor": 0.12})
        self.assertEqual(bands[-1], {"from": 100, "to": None, "factor": 0.22})

    def test_rejects_a_formula_that_is_not_a_band_chain(self):
        with self.assertRaises(ValueError):
            parse_bands("=X138*2")

    def test_a_plain_number_is_one_flat_band(self):
        self.assertEqual(parse_bands(0.007), [{"from": 0, "to": None, "factor": 0.007}])
        self.assertEqual(parse_bands(3), [{"from": 0, "to": None, "factor": 3.0}])

    def test_rejects_a_boolean(self):
        with self.assertRaises(ValueError):
            parse_bands(True)


class ExtractRelics(unittest.TestCase):
    def test_names_and_buffs_come_from_the_equipment_sheet(self):
        relics, _ = extract_relics(equipment(), equipment_data())
        self.assertEqual(
            [(r["id"], r["name"], r["buff"], r["maxLevel"]) for r in relics],
            [(0, "Strength Gloves", "Extra Dmg", 100), (1, "Emperor Ring", "Earth Dmg", 100)],
        )

    def test_bands_are_attached_in_order(self):
        relics, _ = extract_relics(equipment(), equipment_data())
        self.assertEqual(relics[0]["bands"][-1]["factor"], 0.22)
        self.assertEqual(relics[1]["bands"], [
            {"from": 0, "to": 9, "factor": 0.005},
            {"from": 10, "to": None, "factor": 0.04},
        ])

    def test_player_level_is_not_extracted(self):
        relics, _ = extract_relics(equipment(), equipment_data())
        self.assertNotIn(55, relics[0].values())

    def test_mismatched_relic_order_is_an_error(self):
        with self.assertRaisesRegex(ValueError, "Focus Ring"):
            extract_relics(equipment(), equipment_data(W138="Focus Ring"))

    def test_icons_come_from_the_icon_column(self):
        _, icons = extract_relics(equipment(), equipment_data())
        self.assertEqual(image_size(icons["Strength Gloves"]), (64, 64))
        self.assertNotIn("Emperor Ring", icons)

    def test_percent_comes_from_the_bonus_text(self):
        relics, _ = extract_relics(
            equipment(D75="Focus Ring Max Level 100", F75="Accuracy Rate +0"),
            equipment_data(W139="Focus Ring", AA139=3),
        )
        self.assertEqual([(r["name"], r["percent"]) for r in relics], [
            ("Strength Gloves", True),
            ("Focus Ring", False),
        ])
        self.assertEqual(relics[1]["bands"], [{"from": 0, "to": None, "factor": 3.0}])


if __name__ == "__main__":
    unittest.main()
