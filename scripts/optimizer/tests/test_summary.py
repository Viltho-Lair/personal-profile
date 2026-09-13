import unittest

from optimizer.summary import diff_items, format_diff

OLD = [
    {"name": "Fire Slash", "maxLevel": 130, "icon": "/skills/a.png"},
    {"name": "Retired", "maxLevel": 1},
]
NEW = [
    {"name": "Fire Slash", "maxLevel": 250, "icon": "/art/skills/b.png"},
    {"name": "Rekindle", "maxLevel": 250},
]


class DiffItems(unittest.TestCase):
    def test_added_removed_and_changed(self):
        self.assertEqual(diff_items(OLD, NEW, "name"), {
            "added": ["Rekindle"],
            "removed": ["Retired"],
            "changed": {"Fire Slash": {"maxLevel": (130, 250)}},
        })

    def test_icon_changes_are_not_reported(self):
        same = [{"name": "Fire Slash", "maxLevel": 130, "icon": "/elsewhere.png"}]
        self.assertEqual(diff_items(OLD[:1], same, "name")["changed"], {})


class FormatDiff(unittest.TestCase):
    def test_lists_each_change_on_its_own_line(self):
        lines = format_diff("skills", diff_items(OLD, NEW, "name")).splitlines()
        self.assertEqual(lines, [
            "skills: 1 added, 1 removed, 1 changed",
            "  + Rekindle",
            "  - Retired",
            "  ~ Fire Slash maxLevel: 130 -> 250",
        ])


if __name__ == "__main__":
    unittest.main()
