import unittest

from optimizer.shrine import extract_shrine
from optimizer.tests.support import build_sheet


class Shrine(unittest.TestCase):
    def test_level_tables_and_art(self):
        cells = {"A1": "Order", "F1": "Demon", "I1": "Chaos", "L1": "Dragon"}
        headers = {"A2": "level", "B2": "Fire", "C2": "Water", "D2": "Wind", "E2": "Earth",
                   "F2": "Level", "G2": "Ch HP", "H2": "Amp Skill", "I2": "Level", "J2": "SW Atk", "K2": "Ch Atk",
                   "L2": "Level", "M2": "Str", "N2": "Hp", "O2": "Vit", "P2": "Cri", "Q2": "Luk"}
        rows = {"A3": 1, "B3": 0, "F3": 1, "G3": 0, "I3": 1, "L3": 1,
                "A4": 2, "B4": 1, "F4": 2, "G4": 5, "I4": 2, "J4": 5, "L4": 2, "M4": 20}
        data = build_sheet({**cells, **headers, **rows}, title="Equipment Data")
        panel = build_sheet({"M72": "Statue of Dragon", "O72": "Statue of Order", "M88": "Statue of Chaos", "O88": "Statue of Demon"},
                            title="EQUIPMENT", images=[("M74", 32), ("O74", 32)])
        statues, art = extract_shrine(data, panel)
        by_key = {s["key"]: s for s in statues}
        self.assertEqual(by_key["order"]["levels"], [[0, 0, 0, 0], [0.01, 0, 0, 0]])
        self.assertEqual(by_key["demon"]["stats"], ["Character HP", "Amplify Skill Dmg"])
        self.assertEqual(by_key["dragon"]["levels"][1][0], 0.2)
        self.assertEqual(sorted(art), ["dragon", "order"])
