import unittest

from optimizer.character import _ability_options, _classes, _growth, _promotions
from optimizer.tests.support import build_sheet


class Promotions(unittest.TestCase):
    def test_tables_merge_by_position_despite_spelling(self):
        sheet = build_sheet({
            "C2": "PROMOTION", "F2": "ATK / HP BONUS", "G2": "Extra ATK(%)", "K2": "Extra EXP(%)",
            "C3": "Stone", "F3": 1, "G3": 0.4, "K3": 0.15,
            "C4": "Eisenhart", "F4": 2, "G4": 0.8, "K4": 0.3,
            "C30": "PROMOTION", "F30": "ATK / HP BONUS", "G30": "Extra HP(%)",
            "C31": "Stone", "F31": 1, "G31": 0.7,
            "C32": "Eisenhardt", "F32": 2, "G32": 1.4,
        }, title="Character Data")
        promotions = _promotions(sheet)
        self.assertEqual(promotions[1], {
            "number": 2, "name": "Eisenhart", "atkHpBonus": 2, "extraAtk": 0.8,
            "monsterGold": None, "extraExp": 0.3, "extraHp": 1.4,
        })


class AbilityOptions(unittest.TestCase):
    def test_each_option_lists_its_values(self):
        sheet = build_sheet({
            "S1": "ABILITY OPTIONS", "S2": "Extra ATK(%)", "T2": "Extra EXP(%)",
            "S3": 3, "S4": 4, "S5": 5, "T3": 1, "T4": 2,
        }, title="Character Data")
        self.assertEqual(_ability_options(sheet), [
            {"name": "Extra ATK(%)", "values": [3, 4, 5]},
            {"name": "Extra EXP(%)", "values": [1, 2]},
        ])


class Growth(unittest.TestCase):
    def test_bonus_per_level_reads_referenced_and_literal_amounts(self):
        character = build_sheet({
            "B22": "GROWTH", "I24": "CURRENT LVL", "L24": "BASE BONUS",
            "E25": "STR\n(ATK Damage)", "L25": "=I25*'Character Data'!AF9",
            "E27": "LUK\n(Gold Gain)", "L27": "=I27*'Character Data'!AF13/100",
            "E29": "ACC\n(ATK Accuracy)", "L29": "=I29*3",
            "E31": "DODGE\n(Dodge Chance)", "L31": "=I31",
        }, title="CHARACTER")
        data = build_sheet({"AF9": 5, "AF13": 0.5}, title="Character Data")
        self.assertEqual(
            [(g["key"], g["detail"], g["perLevel"]) for g in _growth(character, data)],
            [("STR", "ATK Damage", 5), ("LUK", "Gold Gain", 0.005), ("ACC", "ATK Accuracy", 3.0), ("DODGE", "Dodge Chance", 1)],
        )


class Classes(unittest.TestCase):
    def test_names_and_multipliers(self):
        sheet = build_sheet({
            "A57": "CLASSES", "A58": "TYPE", "B58": "OWNED", "C58": "MULTIPLIER",
            "A59": "Trainee", "C59": 1, "A60": "Adventurer", "C60": 4,
        }, title="Equipment Data")
        self.assertEqual(_classes(sheet), [{"name": "Trainee", "multiplier": 1}, {"name": "Adventurer", "multiplier": 4}])


if __name__ == "__main__":
    unittest.main()
