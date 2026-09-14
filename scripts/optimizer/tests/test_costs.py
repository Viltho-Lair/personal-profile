import unittest

from optimizer.costs import extract_companion_passive_costs, extract_cube_costs, extract_gold_costs, extract_spirit_crystals
from optimizer.tests.support import build_sheet


class CubeCosts(unittest.TestCase):
    def test_orr_by_level_and_the_grade_factors(self):
        sheet = build_sheet({
            "O1": "Orr Cost", "O2": "Level", "P2": "Cost", "O3": 0, "P3": 0, "O4": 1, "P4": 10205, "O5": 2, "P5": 28233,
            "R1": "Weapon Cost Factor", "R2": "WEAPON", "S2": "Factor", "R3": "Common 4", "S3": 1, "R4": "Immortal", "S4": 10000,
            "U1": "Class Cost Factor", "U2": "Grade", "V2": "Factor", "U3": 1, "V3": 10, "U4": 2, "V4": 20,
            "CG1": "SPIRIT COST", "CG2": "Level", "CH2": "Crystal", "CG3": 0, "CH3": 300, "CG4": 1, "CH4": 315,
        }, title="Equipment Data")
        self.assertEqual(extract_cube_costs(sheet), {
            "orr": [0, 10205, 28233],
            "weaponFactors": {"Common 4": 1, "Immortal": 10000},
            "classFactors": [10, 20],
        })
        self.assertEqual(extract_spirit_crystals(sheet), [300, 315])


class GoldCosts(unittest.TestCase):
    def test_crit_chance_table_and_multiplier_bands_below_a_million(self):
        sheet = build_sheet({
            "J3": "Multiple", "K3": "Multiplier Starting Interval",
            "J4": 1, "J5": 1.2, "K5": 70000, "J6": 1.5, "K6": 75000, "J7": 230.02, "K7": 1000000,
            "AK1": "CRIT % COST TABLE", "AK2": "Level", "AL2": "COST TO NXT LEVEL", "AK3": 0, "AL3": 1, "AK4": 1, "AL4": 11,
        }, title="Gold Enhancement Data")
        self.assertEqual(extract_gold_costs(sheet), {
            "critChance": [1, 11],
            "bands": [{"from": 1, "multiple": 1}, {"from": 70000, "multiple": 1.2}, {"from": 75000, "multiple": 1.5}],
        })


class CompanionPassiveCosts(unittest.TestCase):
    def test_stone_and_emerald_by_level_for_each_passive(self):
        sheet = build_sheet({
            "A1": "Ellie",
            "AG1": "Ellie", "AG2": "Level", "AH2": "Intensive Fire", "AJ2": "Blessing of Forest",
            "AG4": 0, "AH4": 0, "AI4": 0, "AJ4": 0, "AK4": 0,
            "AG5": 1, "AH5": 16, "AI5": 8, "AJ5": 40, "AK5": 20,
        }, title="Companions Data")
        self.assertEqual(extract_companion_passive_costs(sheet, ["Ellie"]), {
            "Ellie": {
                "Intensive Fire": {"stone": [0, 16], "emerald": [0, 8]},
                "Blessing of Forest": {"stone": [0, 40], "emerald": [0, 20]},
            },
        })
