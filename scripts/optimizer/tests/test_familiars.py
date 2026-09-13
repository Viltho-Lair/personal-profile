import unittest

from optimizer.familiars import extract_familiars
from optimizer.tests.support import build_sheet
from optimizer.workbook import MissingHeader, image_size

CELLS = {
    # Mana Altar
    "A2": "Id", "B2": "Level", "C2": "SkillDmgAdd", "D2": "Soul", "E2": "NeedLevelCount",
    "A3": 1.0, "B3": 1.0, "C3": 3.0, "D3": 0.0, "E3": 30.0,
    # stats per star
    "G2": "Id", "H2": "Level", "I2": "Grade", "J2": "EffectLevel",
    "K2": "AttackRange1__1", "L2": "AttackRange1__2",
    "G3": 0.0, "H3": 0.0, "I3": 0.0, "J3": 1.0, "K3": 1.0, "L3": 100.0,
    "G4": 1.0, "H4": 1.0, "I4": 0.0, "J4": 1.0, "K4": 1.0, "L4": 135.0,
    # roster and rarities
    "E42": "name", "F42": "0*-5*", "G42": "6*-7*", "L42": "symbol", "M42": "id",
    "A43": "Rarity", "B43": "Rarity Group", "E43": "NA", "M43": 100.0,
    "A44": 0.0, "B44": "Common", "A45": 1.0, "B45": "Common",
    # element ids for attribute familiars
    "I71": "Applicable elemental dmg", "I72": "HI", "J72": 1.0,
    # the formula block the SKILLS sheet reads
    "B72": "NA", "D72": "Range :", "E72": "=IFERROR(VLOOKUP(C72,G$3:AA$14,5,0),)",
    "F72": "Damage :", "G72": "=IFERROR(VLOOKUP(C72,G$3:AA$14,6,0),)/100",
    "H72": '=if(AND(C72=11,B72=G60),"+ Increase DMG to enemies with 60% or less HP by 10%","")',
}


def familiar_sheet(**overrides):
    cells = {**CELLS, **overrides}
    return build_sheet({k: v for k, v in cells.items() if v is not None}, title="Familiar Data",
                       images=[("F43", 128), ("G43", 128), ("L43", 64)])


class ExtractFamiliars(unittest.TestCase):
    def test_reads_stats_per_star_from_the_formula_columns(self):
        familiars, _, _ = extract_familiars(familiar_sheet())
        na = familiars[0]
        self.assertEqual((na["name"], na["group"], na["id"]), ("Na", "weapon", 100))
        self.assertEqual(na["stats"], [{"label": "Range", "percent": False}, {"label": "Damage", "percent": True}])
        self.assertEqual(na["stars"][1], {"star": 1, "rarity": "Common", "values": {"Range": 1, "Damage": 1.35}})
        self.assertEqual(na["special"], "Increase DMG to enemies with 60% or less HP by 10%")

    def test_art_per_star_band_and_symbol(self):
        familiars, _, art = extract_familiars(familiar_sheet())
        self.assertEqual([(a["from"], a["to"], a["icon"]) for a in familiars[0]["art"]],
                         [(0, 5, "na-0-5"), (6, 7, "na-6-7")])
        self.assertEqual(image_size(art["na-symbol"]), (64, 64))

    def test_reads_the_mana_altar(self):
        _, altar, _ = extract_familiars(familiar_sheet())
        self.assertEqual(altar, [{"level": 1, "skillDamage": 3, "soul": 0, "starsNeeded": 30}])

    def test_a_familiar_without_stat_formulas_stops_extraction(self):
        with self.assertRaisesRegex(ValueError, "NA"):
            extract_familiars(familiar_sheet(B72=None))

    def test_missing_star_bands_are_named(self):
        with self.assertRaisesRegex(MissingHeader, "star band"):
            extract_familiars(familiar_sheet(F42=None, G42=None))


if __name__ == "__main__":
    unittest.main()
