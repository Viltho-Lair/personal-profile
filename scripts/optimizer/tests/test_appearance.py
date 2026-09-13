import unittest

from optimizer.appearance import extract_appearance
from optimizer.tests.support import build_sheet


class Appearance(unittest.TestCase):
    def test_clothing_guild_and_sweatsuit_rows(self):
        sheet = build_sheet(
            {
                "C5": "OWN", "D5": "CLOTHING", "F5": "BONUS TYPE", "G5": "EFFECT",
                "E6": "Pac-Man T-shirt", "F6": "Dodge", "G6": 3,
                "E7": "Sweatsuit (Orange)", "F7": "Monster Gold", "G7": 0.12,
                "E8": "Sweatsuit (White)", "F8": "Monster Gold", "G8": 2,
                "J11": "GUILD SHOP APPEARANCE",
                "J15": "OWN", "K15": "CLOTHING", "M15": "BONUS TYPE", "N15": "EFFECT",
                "L16": "Unity", "M16": "Character ATK", "N16": 0.1,
            },
            title="APPEARANCE",
            images=[("D6", 32), ("K16", 32)],
        )
        character = build_sheet({"R52": '=IFNA(IFS(X<=0,"Locked", APPEARANCE!$C$8, "(x 3)", APPEARANCE!$C$7, "(x 2)"), "(x 1)")'}, title="CHARACTER")
        clothing, guild, art = extract_appearance(sheet, character)
        self.assertEqual([c["name"] for c in clothing], ["Pac-Man T-shirt", "Sweatsuit (Orange)", "Sweatsuit (White)"])
        self.assertEqual(clothing[1], {"name": "Sweatsuit (Orange)", "bonus": "Monster Gold", "value": 0.12, "promotionRow": 0, "multiplier": 2, "key": "clothing-1"})
        self.assertEqual(clothing[2]["multiplier"], 3)
        self.assertNotIn("multiplier", clothing[0])
        self.assertEqual(guild, [{"name": "Unity", "bonus": "Character ATK", "value": 0.1, "key": "guild-0"}])
        self.assertEqual(sorted(art), ["clothing-0", "guild-0"])
