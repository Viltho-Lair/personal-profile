import unittest

from optimizer.proficiency import extract_proficiency
from optimizer.tests.support import build_sheet
from optimizer.workbook import MissingHeader


def proficiency_sheet(**overrides):
    cells = {
        "A1": "SKILL", "AN1": "PROFICIENCY\nLEVEL", "AO1": "PROFICIENCY\nBONUS",
        "AN2": 0.0, "AO2": 0, "AN3": 1.0, "AO3": 0.05, "AN4": 2.0, "AO4": 0.1,
        **overrides,
    }
    return build_sheet({k: v for k, v in cells.items() if v is not None}, title="Skills Data")


class ExtractProficiency(unittest.TestCase):
    def test_bonus_index_is_the_level(self):
        self.assertEqual(extract_proficiency(proficiency_sheet()), [0, 0.05, 0.1])

    def test_levels_must_count_up_from_zero(self):
        with self.assertRaisesRegex(ValueError, "level 2"):
            extract_proficiency(proficiency_sheet(AN4=5.0))

    def test_a_level_without_a_bonus_stops_extraction(self):
        with self.assertRaisesRegex(ValueError, "level 1"):
            extract_proficiency(proficiency_sheet(AO3=None))

    def test_missing_header_is_named(self):
        with self.assertRaisesRegex(MissingHeader, "PROFICIENCY"):
            extract_proficiency(proficiency_sheet(AO1=None))


if __name__ == "__main__":
    unittest.main()
