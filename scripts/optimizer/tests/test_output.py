"""Checks the committed extractor output against values confirmed in game."""

import json
import unittest
from pathlib import Path

DATA = Path(__file__).resolve().parents[3] / "src" / "data" / "optimizer"

KNOWN_SKILLS = [
    "Fire Slash", "Ice Stone", "Lightning Slash", "Stone Strike", "Fire Sword",
    "Mana's Blessing", "Lightning Stroke", "Ground's Blessing", "Hot Blast", "Ice Shower",
    "Agile", "Power Strike", "Flame Slash", "Water Slash", "Thunder Slash", "Power Impact",
    "Burning Sword", "Flowing Blade", "Speed Sword", "Earth's Will", "Flame Wave",
    "Curved Blade", "Fulgurous", "Iron Will", "Hellfire Slash", "Dancing Waves",
    "Wind Sword", "Life Mana", "Fire Blast", "Ice Time", "Thunderbolt Slash", "Giga Strike",
    "Rage", "Meditation", "Red Lightning", "Giga Impact", "Pillar of Fire", "Blizzard",
    "Supersonic", "Demon Hunt", "Warrior Burn", "Strong Current", "Lightning Body",
    "Wrath of Gods", "Rave", "Mantra",
]
FILES = {
    "skills.json": "skills", "weapons.json": "weapons", "accessories.json": "accessories",
    "relics.json": "relics", "spirits.json": "spirits", "soul-weapons.json": "soulWeapons",
}
PLAYER_FIELDS = {"owned", "currentLevel", "equipped", "level", "currentEquipEffect", "rarity", "bonus", "successRate"}


def load(filename):
    return json.loads((DATA / filename).read_text(encoding="utf-8"))


def items(filename):
    return load(filename)[FILES[filename]]


def buff_at(relic, level):
    band = next(b for b in relic["bands"] if b["from"] <= level and (b["to"] is None or level <= b["to"]))
    return level * band["factor"] * 100


@unittest.skipUnless((DATA / "skills.json").exists(), "run scripts/extract-optimizer.py first")
class ExtractedOutput(unittest.TestCase):
    def test_counts(self):
        counts = {name: len(items(name)) for name in FILES}
        self.assertEqual(counts, {
            "skills.json": 64, "weapons.json": 25, "accessories.json": 25,
            "relics.json": 12, "spirits.json": 12, "soul-weapons.json": 97,
        })

    def test_every_known_skill_is_present(self):
        names = {s["name"] for s in items("skills.json")}
        self.assertEqual(set(KNOWN_SKILLS) - names, set())

    def test_skill_values(self):
        fire = next(s for s in items("skills.json") if s["name"] == "Fire Slash")
        self.assertEqual((fire["maxLevel"], fire["cooldown"], fire["baseValue"]), (250, 12, 400))

    def test_skill_categories(self):
        skills = items("skills.json")
        by_category = {c: sorted(s["name"] for s in skills if s["category"] == c) for c in ("core", "seasonal", "immortal")}
        self.assertEqual(by_category["immortal"], ["Mantra", "Rave"])
        self.assertEqual((len(by_category["core"]), len(by_category["seasonal"])), (44, 18))
        self.assertIn("Rekindle", by_category["seasonal"])

    def test_proficiency_bonus_per_level(self):
        bonuses = load("skill-proficiency.json")["bonuses"]
        self.assertEqual((len(bonuses), bonuses[0], bonuses[1], bonuses[328]), (329, 0, 0.05, 1332.87))

    def test_gear_effect_matches_the_game(self):
        factors = load("gear-levels.json")["factors"]
        accessory = next(g for g in items("accessories.json") if g["grade"] == "Common 4")
        equip = accessory["multiplier"] * factors[297]
        self.assertAlmostEqual(equip, 109.9, delta=0.1)
        self.assertAlmostEqual(equip * 0.3, 33.0, delta=0.1)
        self.assertEqual(accessory["maxLevel"], len(factors) - 1)

    def test_relic_buffs_match_the_game(self):
        relics = {r["name"]: r for r in items("relics.json")}
        self.assertAlmostEqual(buff_at(relics["Strength Gloves"], 100), 2200)
        self.assertAlmostEqual(buff_at(relics["Hunter's Eye"], 100), 400)
        self.assertAlmostEqual(buff_at(relics["HP Ring"], 100), 1400)
        self.assertAlmostEqual(buff_at(relics["Strength Gloves"], 50), 400)

    def test_relic_percent_flags_match_the_game_labels(self):
        relics = {r["name"]: r for r in items("relics.json")}
        self.assertTrue(relics["Strength Gloves"]["percent"])
        self.assertFalse(relics["Focus Ring"]["percent"])
        self.assertFalse(relics["Invisible Cloak"]["percent"])
        self.assertEqual(relics["Bracelet of Speed"]["bands"], [{"from": 0, "to": None, "factor": 0.007}])

    def test_spirits_have_max_level_element_and_skill(self):
        for spirit in items("spirits.json"):
            self.assertEqual(spirit["maxLevel"], 1000)
            self.assertIsNotNone(spirit["element"], spirit["name"])
            self.assertIsNotNone(spirit["skill"], spirit["name"])

    def test_gear_art_covers_every_grade_but_immortal(self):
        for filename in ("weapons.json", "accessories.json"):
            missing = [g["grade"] for g in items(filename) if not g["icon"]]
            self.assertTrue(set(missing) <= {"Immortal"}, f"{filename}: {missing}")

    def test_unnamed_soul_weapons_are_labelled_by_stage(self):
        names = [w["name"] for w in items("soul-weapons.json")]
        unnamed = [n for n in names if n.startswith("Unnamed (stage ")]
        self.assertEqual(unnamed, [f"Unnamed (stage {stage})" for stage in range(1860, 2001, 20)])
        self.assertEqual(len(set(names)), len(names))

    def test_soul_weapon_disassembly_is_half_the_cost(self):
        innocence = next(w for w in items("soul-weapons.json") if w["name"] == "Innocence")
        self.assertEqual((innocence["cost"], innocence["disassemblyReward"]), (2000, 1000))

    def test_no_player_state_is_extracted(self):
        for filename in FILES:
            for item in items(filename):
                self.assertEqual(PLAYER_FIELDS & set(item), set(), f"{filename}: {item.get('name') or item.get('grade')}")

    def test_every_file_names_its_source(self):
        for filename in [*FILES, "gear-levels.json"]:
            source = load(filename)["source"]
            self.assertEqual(set(source), {"file", "sheet", "extractedOn"}, filename)


if __name__ == "__main__":
    unittest.main()
