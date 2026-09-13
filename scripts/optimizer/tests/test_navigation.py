import unittest

from optimizer.navigation import extract_navigation_icons
from optimizer.tests.support import build_sheet
from optimizer.workbook import MissingHeader, image_size


class NavigationIcons(unittest.TestCase):
    def test_icon_above_each_section_title(self):
        sheet = build_sheet({"C9": "CHARACTER", "D9": "EQUIPMENT", "E9": "COMPANIONS", "F9": "SKILLS"}, title="HOME",
                            images=[("C8", 128), ("D8", 128), ("E8", 64), ("F8", 128)])
        icons = extract_navigation_icons(sheet)
        self.assertEqual(sorted(icons), ["char", "companion", "equips", "skill"])
        self.assertEqual(image_size(icons["companion"]), (64, 64))

    def test_missing_icon_is_named(self):
        sheet = build_sheet({"C9": "CHARACTER", "D9": "EQUIPMENT", "E9": "COMPANIONS", "F9": "SKILLS"}, title="HOME",
                            images=[("C8", 128)])
        with self.assertRaisesRegex(MissingHeader, "companion"):
            extract_navigation_icons(sheet)


if __name__ == "__main__":
    unittest.main()
