import unittest

from optimizer.black_orb import extract_black_orb
from optimizer.tests.support import build_sheet


class BlackOrb(unittest.TestCase):
    def test_buffs_resonance_and_awakening(self):
        sheet = build_sheet(
            {
                "F1": "Black Orb Resonance",
                "A2": "GachaLevel", "B2": "Level", "C2": "BuffType", "D2": "BuffValue",
                "F2": "Level", "G2": "HP SUM", "H2": "ATK SUM", "I2": "ALL SUM",
                "A3": 1, "C3": 0, "D3": 0,
                "A4": 2, "C4": 2, "D4": 10,
                "A5": 3, "C5": 1, "D5": 50,
                "F3": 50, "G3": 3, "H3": 0, "I3": 0,
                "F4": 52, "G4": 6, "H4": 0, "I4": 0,
                "K10": "Top stat bonus %",
                "K12": 0, "L12": 0, "K13": 1, "L13": 10, "K14": 9, "L14": 70,
            },
            title="Black Orb Data",
        )
        orb = extract_black_orb(sheet)
        self.assertEqual(orb["buffs"], [{"level": 2, "type": "monster", "value": 10}, {"level": 3, "type": "boss", "value": 50}])
        self.assertEqual(orb["resonance"][1], {"levels": 52, "hp": 6, "atk": 0, "all": 0})
        self.assertEqual(orb["awakening"], [[0, 0], [1, 10], [9, 70]])
