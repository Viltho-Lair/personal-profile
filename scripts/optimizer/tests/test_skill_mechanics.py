import unittest

from optimizer.skill_mechanics import extract_skill_mechanics
from optimizer.tests.support import build_sheet

HEADERS = {
    "A1": "SKILL", "H1": "Id", "P1": "skillType", "Q1": "activeType", "S1": "passiveType",
    "W1": "ActiveNeedValue", "Y1": "Duration", "AD1": "AdditionalValue__1", "AE1": "AdditionalValue__2",
    "AF1": "Hits with SM", "AG1": "SM AMP",
}


def sheet(cells):
    return build_sheet({**HEADERS, **cells}, title="Skills Data")


class SkillMechanics(unittest.TestCase):
    def test_types_triggers_and_mastery_links(self):
        cells = {
            "A3": "Fire Slash", "H3": 1, "P3": 0, "Q3": 4, "S3": 0, "W3": 12, "Y3": 0,
            "AF3": "=IF('SKILL MASTERY'!J19, 2, 1)",
            "AG3": "=IF('SKILL MASTERY'!J19, 1.5, 1)* IF('SKILL MASTERY'!DZ19, 3, 1)",
            "A4": "Stone Strike", "H4": 34, "P4": 0, "Q4": 4, "S4": 0, "W4": 9,
            "AF4": 1, "AG4": "=IF('SKILL MASTERY'!BX24, 3, 1) * IF('SKILL MASTERY'!FT24, 3 * IF(SKILLS!I13 = \"Boss\", 1.2, 1), 1)",
            "A5": "Burning Sword", "H5": 9, "P5": 2, "Q5": 2, "S5": 1, "W5": 5, "Y5": 5, "AF5": 0, "AG5": 0,
            "A6": "Waterspout", "H6": 1013,
        }
        mechanics = extract_skill_mechanics(sheet(cells), sheet(cells))
        fire = mechanics["Fire Slash"]
        self.assertEqual((fire["type"], fire["trigger"], fire["every"]), ("attack", "hits", 12))
        self.assertEqual(fire["hits"], {"base": 1.0, "mastery": {"cell": "J19", "hits": 2.0}})
        self.assertEqual(fire["masteryDamage"], [{"cell": "J19", "multiplier": 1.5}, {"cell": "DZ19", "multiplier": 3.0}])
        self.assertAlmostEqual(mechanics["Stone Strike"]["masteryDamage"][1]["multiplier"], 3.6)
        burning = mechanics["Burning Sword"]
        self.assertEqual((burning["type"], burning["trigger"], burning["passive"], burning["hits"]), ("passive", "seconds", "stack", None))
        self.assertNotIn("Waterspout", mechanics)
