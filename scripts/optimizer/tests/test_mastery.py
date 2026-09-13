import unittest

from openpyxl.utils import get_column_letter

from optimizer.mastery import extract_mastery
from optimizer.tests.support import build_sheet
from optimizer.workbook import MissingHeader

BLACK, GREY = "FF000000", "FF666666"


def page_background(first_col=3, rows=range(5, 20)):
    return {f"{get_column_letter(c)}{r}": BLACK for r in rows for c in range(first_col, first_col + 19)}


def mastery_sheet(extra_cells=None, extra_fills=None):
    cells = {
        "C4": "PAGE 1",
        # A skill node at J6..N9: costs 100, needs a mythic accessory
        "J6": "SKILL", "J7": '=IF(J9=TRUE, "MAX", "COST: " & 100)',
        "J8": '=IF(J9=TRUE, "BONUS: 3x DMG", "ACC M4")', "J9": False,
        # A level node at D12..H15 below-left of it
        "E11": "ATK", "D12": '=IF(D14>= 10, "MAX", "COST: " & 400-D14*40)',
        "D13": "BONUS :", "G13": "=D14*0.2", "D14": 0,
        # A reward node at P12..T15, not linked
        "Q11": "MYTHIC G1", "P12": "REWARD:", "P13": "WEAPON M1", "P14": False,
        **(extra_cells or {}),
    }
    fills = page_background()
    # connector: down from the skill node, left, then down into the ATK node
    for ref in ("L10", "K10", "J10", "I10", "H10", "G10", "F10"):
        fills[ref] = GREY
    fills.update(extra_fills or {})
    sheet = build_sheet(cells, title="SKILL MASTERY", images=[("D11", 64), ("J6", 64), ("P11", 64)],
                        fills=fills, validations=[("D14", 0, 10)])
    sheet["G13"].number_format = "0%"
    return sheet


class ExtractMastery(unittest.TestCase):
    def test_reads_level_check_and_reward_nodes(self):
        pages, _ = extract_mastery(mastery_sheet())
        nodes = {node["id"]: node for node in pages[0]["nodes"]}
        self.assertEqual(sorted(nodes), ["1-D12", "1-J7", "1-P12"])

        skill = nodes["1-J7"]
        self.assertEqual((skill["kind"], skill["label"], skill["cost"], skill["requires"], skill["bonus"]),
                         ("check", "SKILL", {"base": 100, "perLevel": 0}, "ACC M4", {"text": "3x DMG"}))

        atk = nodes["1-D12"]
        self.assertEqual((atk["kind"], atk["label"], atk["maxLevel"], atk["x"], atk["y"]), ("level", "ATK", 10, 1, 6))
        self.assertEqual(atk["cost"], {"base": 400, "perLevel": -40})
        self.assertEqual(atk["bonus"]["perLevel"], 0.2)

        self.assertEqual((nodes["1-P12"]["label"], nodes["1-P12"]["reward"]), ("MYTHIC G1", "WEAPON M1"))

    def test_grey_cells_link_the_nodes_they_touch(self):
        pages, _ = extract_mastery(mastery_sheet())
        self.assertEqual([link["nodes"] for link in pages[0]["links"]], [["1-D12", "1-J7"]])

    def test_icons_are_shared_by_content(self):
        pages, icons = extract_mastery(mastery_sheet())
        self.assertEqual(len(icons), 1)
        self.assertTrue(all(node["icon"] in icons for node in pages[0]["nodes"]))

    def test_a_level_node_needs_a_max_level(self):
        cells = {"Y11": "HP", "X12": '=IF(X14>= 5, "MAX", "COST: " & 100-X14*20)', "X13": "BONUS :",
                 "AA13": "=X14*0.1", "X14": 0}
        with self.assertRaisesRegex(ValueError, "X14"):
            extract_mastery(mastery_sheet(extra_cells={"W4": "PAGE 2", **cells},
                                          extra_fills=page_background(first_col=23)))

    def test_missing_pages_are_named(self):
        with self.assertRaisesRegex(MissingHeader, "PAGE"):
            extract_mastery(build_sheet({"A1": "x"}, title="SKILL MASTERY"))


if __name__ == "__main__":
    unittest.main()
