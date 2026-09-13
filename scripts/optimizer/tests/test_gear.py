import unittest

from optimizer.gear import extract_gear, extract_level_factors
from optimizer.tests.support import build_sheet
from optimizer.workbook import MissingHeader

CELLS = {
    "A1": "WEAPONS",
    "A2": "TYPE", "B2": "OWNED", "C2": "MULTIPLIER", "D2": "CURRENT LEVEL", "E2": "MAX LVL",
    "F2": "CRIT HIT WHEN 0", "G2": "GOLD BONUS", "H2": "CRIT HIT INCREASE AT 0",
    "I2": "CURRENT EQUIP EFFECT",
    "A3": "Common 4", "B3": True, "C3": 7.0, "D3": 150, "E3": 200, "F3": 0.0, "G3": 0.0, "H3": 0.0, "I3": 7,
    "A4": "Immortal", "B4": False, "C4": 10000000.0, "D4": 0, "E4": 200, "F4": 0, "G4": 0, "H4": 0.15, "I4": 0,
    "A6": "ACCESSORIES",
    "A7": "TYPE", "B7": "OWNED", "C7": "MULTIPLIER", "D7": "CURRENT LEVEL", "E7": "MAX LVL",
    "F7": "MAX MANA AT 0", "G7": "EXP Bonus", "H7": "MANA RECOVERY AT 0", "I7": "CURRENT EQUIP EFFECT",
    "A8": "Common 4", "C8": 7.0, "E8": 200, "F8": 0.0, "G8": 0.0, "H8": 0.0,
    "L1": "Equip ATK factor", "L2": "Stage", "M2": "Factor",
    "L3": 0, "M3": 1.0, "L4": 1, "M4": 1.375, "L5": 2, "M5": 1.5,
}


def equipment_sheet(**overrides):
    cells = {**CELLS, **overrides}
    return build_sheet({k: v for k, v in cells.items() if v is not None}, title="Equipment Data")


class ExtractGear(unittest.TestCase):
    def test_reads_a_graded_weapon(self):
        weapons = extract_gear(equipment_sheet(), "WEAPONS")
        self.assertEqual(weapons[0], {
            "grade": "Common 4", "tier": "Common", "gradeNumber": 4, "tierRank": 0,
            "multiplier": 7, "baseMaxLevel": 200,
            "secondary": {"critHitAt0": 0, "goldBonus": 0, "critHitIncreaseAt0": 0},
        })

    def test_immortal_has_no_grade_number(self):
        immortal = extract_gear(equipment_sheet(), "WEAPONS")[1]
        self.assertEqual((immortal["tier"], immortal["gradeNumber"], immortal["tierRank"]), ("Immortal", None, 6))
        self.assertEqual(immortal["secondary"]["critHitIncreaseAt0"], 0.15)

    def test_each_table_stops_at_its_blank_row(self):
        self.assertEqual(len(extract_gear(equipment_sheet(), "WEAPONS")), 2)
        accessories = extract_gear(equipment_sheet(), "ACCESSORIES")
        self.assertEqual(len(accessories), 1)
        self.assertEqual(set(accessories[0]["secondary"]), {"maxManaAt0", "expBonus", "manaRecoveryAt0"})

    def test_player_columns_are_not_extracted(self):
        weapon = extract_gear(equipment_sheet(), "WEAPONS")[0]
        self.assertNotIn(150, weapon.values())
        self.assertFalse({"owned", "currentLevel", "currentEquipEffect"} & set(weapon))

    def test_missing_header_is_named(self):
        with self.assertRaisesRegex(MissingHeader, "MULTIPLIER"):
            extract_gear(equipment_sheet(C2=None), "WEAPONS")


class ExtractLevelFactors(unittest.TestCase):
    def test_factor_index_is_the_level(self):
        self.assertEqual(extract_level_factors(equipment_sheet()), [1, 1.375, 1.5])

    def test_a_gap_in_levels_is_an_error(self):
        with self.assertRaisesRegex(MissingHeader, "expected level 2"):
            extract_level_factors(equipment_sheet(L5=3))


if __name__ == "__main__":
    unittest.main()
