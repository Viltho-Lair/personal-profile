import unittest

from optimizer.spirits import extract_spirits
from optimizer.tests.support import build_sheet
from optimizer.workbook import MissingHeader, image_size


def equipment_data(**overrides):
    cells = {
        "CG1": "SPIRIT COST", "CG2": "Level", "CH2": "Crystal",
        "CG3": 0, "CH3": 300, "CG4": 1, "CH4": 315, "CG5": 2, "CH5": 331,
        "CJ1": "SPIRITS BASE", "CJ2": "NAME", "CK2": "Common", "CL2": "Great",
        "CJ3": "Ark", "CJ4": "Bo",
        **overrides,
    }
    return build_sheet({k: v for k, v in cells.items() if v is not None},
                       title="Equipment Data", images=[("CK3", 128), ("CL3", 64)])


class ExtractSpirits(unittest.TestCase):
    def test_names_in_order_with_the_shared_max_level(self):
        spirits, _ = extract_spirits(equipment_data())
        self.assertEqual(spirits, [
            {"id": 0, "name": "Ark", "maxLevel": 2},
            {"id": 1, "name": "Bo", "maxLevel": 2},
        ])

    def test_art_comes_from_the_common_rarity_column(self):
        _, icons = extract_spirits(equipment_data())
        self.assertEqual(image_size(icons["Ark"]), (128, 128))
        self.assertNotIn("Bo", icons)

    def test_missing_cost_table_is_named(self):
        with self.assertRaisesRegex(MissingHeader, "SPIRIT COST"):
            extract_spirits(equipment_data(CG1=None))

    def test_skips_the_none_placeholder_row(self):
        spirits, _ = extract_spirits(equipment_data(CJ5="None"))
        self.assertEqual([s["name"] for s in spirits], ["Ark", "Bo"])


if __name__ == "__main__":
    unittest.main()
