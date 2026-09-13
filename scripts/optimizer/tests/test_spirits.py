import unittest

from optimizer.spirits import extract_spirit_factors, extract_spirits
from optimizer.tests.support import build_sheet
from optimizer.workbook import MissingHeader, image_size


def equipment_data(**overrides):
    cells = {
        "CG1": "SPIRIT COST", "CG2": "Level", "CH2": "Crystal",
        "CG3": 0, "CH3": 300, "CG4": 1, "CH4": 315, "CG5": 2, "CH5": 331,
        "CJ1": "SPIRITS BASE", "CJ2": "NAME",
        "CK2": "Common", "CL2": "Great", "CM2": "Rare", "CN2": "Epic", "CO2": "Legendary",
        "CP2": "Mythic", "CQ2": "Immortal", "CR2": "Ancient",
        "CT2": "ATK", "CU2": "HP", "CV2": "GOLD", "CW2": "EXP",
        "CX2": "Slot 1 AMP type", "CY2": "Slot 2 AMP type", "CZ2": "Slot 3 AMP type", "DA2": "Slot 4 AMP type",
        "CJ3": "Ark", "CT3": 1.05, "CU3": 1.05, "CV3": 1.0, "CW3": 1.0, "CX3": 2, "CY3": 1, "CZ3": 4, "DA3": 3,
        "CJ4": "Bo", "CT4": 1.0, "CU4": 1.0, "CV4": 1.05, "CW4": 1.15, "CX4": 1, "CY4": 2, "CZ4": 3, "DA4": 4,
        # GOLD EXP FACTOR and ATTACK HP FACTORS, levels 0-2, two tiers each
        "AI1": "LEVEL", "AJ1": "GOLD EXP FACTOR", "AJ2": "Common", "AK2": "Legendary A0",
        "AI3": 0, "AJ3": 1.0, "AK3": 4.0, "AI4": 1, "AJ4": 1.14, "AK4": 4.55, "AI5": 2, "AJ5": 1.28, "AK5": 5.1,
        "BH1": "LEVEL", "BI1": "ATTACK HP FACTORS", "BI2": "Common", "BJ2": "Legendary A0",
        "BH3": 0, "BI3": 3.33, "BJ3": 13.33, "BH4": 1, "BI4": 3.63, "BJ4": 14.51, "BH5": 2, "BI5": 3.92, "BJ5": 15.69,
        **overrides,
    }
    return build_sheet({k: v for k, v in cells.items() if v is not None},
                       title="Equipment Data", images=[("CK3", 128), ("CO3", 128), ("CK4", 64)])


class ExtractSpirits(unittest.TestCase):
    def test_names_ratios_and_the_shared_max_level(self):
        spirits, _ = extract_spirits(equipment_data())
        self.assertEqual(spirits[0], {
            "id": 0, "name": "Ark", "maxLevel": 2,
            "ratios": {"atk": 1.05, "hp": 1.05, "gold": 1, "exp": 1},
            "fountainSlots": {"atk": 2, "hp": 1, "gold": 4, "exp": 3},
        })
        self.assertEqual([s["name"] for s in spirits], ["Ark", "Bo"])

    def test_art_per_rarity_group(self):
        _, icons = extract_spirits(equipment_data())
        self.assertEqual(sorted(icons), ["Ark|Common", "Ark|Legendary", "Bo|Common"])
        self.assertEqual(image_size(icons["Bo|Common"]), (64, 64))

    def test_missing_cost_table_is_named(self):
        with self.assertRaisesRegex(MissingHeader, "SPIRIT COST"):
            extract_spirits(equipment_data(CG1=None))

    def test_skips_the_none_placeholder_row(self):
        spirits, _ = extract_spirits(equipment_data(CJ5="None"))
        self.assertEqual([s["name"] for s in spirits], ["Ark", "Bo"])

    def test_a_spirit_without_a_ratio_stops_extraction(self):
        with self.assertRaisesRegex(ValueError, "Bo.*GOLD"):
            extract_spirits(equipment_data(CV4=None))


class ExtractSpiritFactors(unittest.TestCase):
    def test_factor_per_tier_and_level(self):
        factors = extract_spirit_factors(equipment_data(), 2)
        self.assertEqual(factors["tiers"], ["Common", "Legendary A0"])
        self.assertEqual(factors["atkHp"]["Legendary A0"], [13.33, 14.51, 15.69])
        self.assertEqual(factors["goldExp"]["Common"], [1, 1.14, 1.28])

    def test_levels_must_count_up_from_zero(self):
        with self.assertRaisesRegex(ValueError, "expected level 1"):
            extract_spirit_factors(equipment_data(BH4=7), 2)

    def test_both_matrices_must_list_the_same_tiers(self):
        with self.assertRaisesRegex(ValueError, "tiers differ"):
            extract_spirit_factors(equipment_data(BJ2="Mythic A0"), 2)


if __name__ == "__main__":
    unittest.main()
