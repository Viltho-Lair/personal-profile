import unittest

from optimizer.constellation import extract_constellation
from optimizer.memory_tree import extract_memory_tree
from optimizer.tests.support import build_sheet

SUB_HEADERS = ["Id", "NeedTreeLevel", "MainNodeIndex", "NodeNumber", "NeedNodeNumber__001", "NeedNodeNumber__002",
               "NeedNodeNumber__003", "NodeType", "MaxLevel", "BuffType", "BuffGameModeType", "Value %",
               "MaterialAmount__001", "RewardType", "RewardAmount"]


def row(cols, r, values):
    return {f"{c}{r}": v for c, v in zip(cols, values) if v is not None}


class MemoryTree(unittest.TestCase):
    def test_nodes_levels_and_icons(self):
        sub_cols = "ABCDEFGHIJKLMNO"
        cells = {}
        cells.update(row(sub_cols, 2, SUB_HEADERS))
        cells.update(row(sub_cols, 3, [1, 1, 1, 1, None, None, None, 1, 1, "CUBE", "RIFT", 0.05, 105, None, None]))
        cells.update(row(sub_cols, 4, [2, 5, 2, 1, None, None, None, 2, 1, "x", "x", 1, None, "Purple Feather", 5]))
        cells.update(row("QRST", 2, ["Id", "NeedNodeNumberRequired__001", "NeedNodeNumberRequired__002", "NeedNodeNumberRequired__003"]))
        cells.update(row("QRST", 3, [1]))
        cells.update(row("QRST", 4, [2, 1]))
        up = ["Id", "level", "TreeGrade", "NeedTotalNodeUpgrade", "BuffType__001", "BuffType__002", "BuffType__003",
              "Value__001", "Value__002", "Value__003"]
        cells.update(row("VWXYZ", 2, up[:5]))
        cells.update(row(["AA", "AB", "AC", "AD", "AE"], 2, up[5:]))
        cells.update(row("VWXYZ", 3, [1, 1, 0, 0, 1]))
        cells.update(row(["AA", "AB", "AC", "AD", "AE"], 3, [None, None, 0.5, None, None]))
        cells["AG1"] = "Cube"
        tree, icons = extract_memory_tree(build_sheet(cells, title="Tree Data", images=[("AH1", 16)]))
        self.assertEqual([n["requires"] for n in tree["mainNodes"]], [[], [1]])
        first = tree["mainNodes"][0]["subNodes"][0]
        self.assertEqual((first["buff"], first["mode"], first["valuePerLevel"], first["costPerLevel"]), ("CUBE", "RIFT", 0.05, 105))
        reward = tree["mainNodes"][1]["subNodes"][0]
        self.assertEqual((reward["buff"], reward["reward"]), (None, {"type": "Purple Feather", "amount": 5}))
        self.assertEqual(tree["levels"], [{"level": 1, "grade": 0, "needsSubNodeLevels": 0, "buffs": [{"type": 1, "value": 0.5}]}])
        self.assertEqual(list(icons), ["cube"])


class Constellation(unittest.TestCase):
    def test_signs_group_nodes_in_unlock_order(self):
        headers = ["NodeId", "SIGN", "SubNodeId", "StarSize", "StarEnergy", "BuffType", "AppliesTo", "BuffValue", "Element", "UnlockLevel",
                   None, "NeedsStarsCrafted", "Level", "Extra ATK", "Extra HP", "Extra HP Recovery", "StarCraftingTimeReduced", "ClassBonuslevelCap"]
        cols = [c for c in "ABCDEFGHIJKLMNOPQR"]
        cells = row(cols, 1, headers)
        cells.update(row(cols, 2, [1, "Cancer", 1, "Small", 5, "EXP", "Training Cave", 5, "Water", 2, None, 0, 1, 0, 0, 0, 0, 0]))
        cells.update(row(cols, 3, [2, "Aries", 1, "Large", 50, "Cube", "Rift", 6, "Fire", 1, None, 4, 2, 50, 30, 20, 2, 50]))
        cells["T1"] = "Aries"
        cells["T5"] = "Aries"
        data, art = extract_constellation(build_sheet(cells, title="Constellation Data", images=[("U1", 16), ("U5", 64)]))
        self.assertEqual([(s["name"], s["element"], s["icon"]) for s in data["signs"]], [("Aries", "Fire", "aries"), ("Cancer", "Water", None)])
        self.assertEqual(data["levels"][1]["extraAtk"], 50)
        self.assertEqual(len(art["aries"]) > 0, True)
