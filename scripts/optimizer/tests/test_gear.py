import unittest

from optimizer.gear import (
    extract_awakening,
    extract_gear,
    extract_gear_icons,
    extract_immortal_art,
    extract_level_factors,
)
from optimizer.tests.support import build_sheet
from optimizer.workbook import MissingHeader, image_size

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


class ExtractGearIcons(unittest.TestCase):
    def equipment_ui(self):
        cells = {
            "H6": "WEAPON", "J6": "ENHANCE LVL", "I7": "Common 4", "I8": "Immortal",
            "H41": "ACCESSORY", "J41": "ENHANCE LVL", "I42": "Common 4",
        }
        return build_sheet(cells, title="EQUIPMENT", images=[("H7", 128), ("H42", 64)])

    def test_art_is_keyed_by_grade_for_each_table(self):
        sheet = self.equipment_ui()
        weapons = extract_gear_icons(sheet, "WEAPON")
        accessories = extract_gear_icons(sheet, "ACCESSORY")
        self.assertEqual(image_size(weapons["Common 4"]), (128, 128))
        self.assertNotIn("Immortal", weapons)
        self.assertEqual(image_size(accessories["Common 4"]), (64, 64))

    def test_missing_header_is_named(self):
        with self.assertRaisesRegex(MissingHeader, "ACCESSORY"):
            extract_gear_icons(build_sheet({"H6": "WEAPON"}, title="EQUIPMENT"), "ACCESSORY")


class ExtractLevelFactors(unittest.TestCase):
    def test_factor_index_is_the_level(self):
        self.assertEqual(extract_level_factors(equipment_sheet()), [1, 1.375, 1.5])

    def test_a_gap_in_levels_is_an_error(self):
        with self.assertRaisesRegex(MissingHeader, "expected level 2"):
            extract_level_factors(equipment_sheet(L5=3))


AWAKEN = {
    "W103": "Awakened Level", "X103": "Max", "Y103": "Orr Multiplier", "Z103": "Orr Crit Multiplier",
    "AA103": "Orr Gold Multiplier", "AB103": "Orb Mana", "AC103": "Orb EXP", "AD103": "Orb Multiplier",
    "W104": 0.0, "X104": 200.0, "Y104": 1.0, "Z104": 0.15, "AA104": 0.25, "AB104": 4.0, "AC104": 1.0, "AD104": 1.0,
    "W105": 1.0, "X105": 250.0, "Y105": 1.18, "Z105": 0.17, "AA105": 0.46, "AB105": 4.1, "AC105": 1.4, "AD105": 1.18,
}


class ExtractAwakening(unittest.TestCase):
    def test_reads_each_awakening(self):
        rows = extract_awakening(build_sheet(AWAKEN, title="Equipment Data"))
        self.assertEqual(rows[1], {
            "awakening": 1, "maxLevel": 250, "weaponMultiplier": 1.18, "weaponCritHit": 0.17,
            "weaponGold": 0.46, "accessoryMaxMana": 4.1, "accessoryExp": 1.4, "accessoryMultiplier": 1.18,
        })

    def test_awakenings_must_count_up(self):
        with self.assertRaisesRegex(ValueError, "expected awakening 1"):
            extract_awakening(build_sheet({**AWAKEN, "W105": 3.0}, title="Equipment Data"))


class ExtractImmortalArt(unittest.TestCase):
    def test_art_by_awakening_for_orr_and_orb(self):
        cells = {"K21": "Orr", "K22": "Orr 6*", "K27": "Orb", "K28": "Orb 6*", "K29": "Wind Mythic"}
        sheet = build_sheet(cells, title="Sprites",
                            images=[("L21", 128), ("L22", 128), ("L27", 64), ("L28", 64), ("L29", 64)])
        art = extract_immortal_art(sheet)
        self.assertEqual(sorted(art["weapons"]), [0, 6])
        self.assertEqual(image_size(art["accessories"][6]), (64, 64))

    def test_missing_art_is_named(self):
        sheet = build_sheet({"K21": "Orr"}, title="Sprites", images=[("L21", 128)])
        with self.assertRaisesRegex(MissingHeader, "accessories"):
            extract_immortal_art(sheet)


if __name__ == "__main__":
    unittest.main()
