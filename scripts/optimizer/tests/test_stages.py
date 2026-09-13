import unittest

from optimizer.stages import extract_promotion_stages, extract_stage_bosses
from optimizer.tests.support import build_sheet


class StageBosses(unittest.TestCase):
    def test_boss_hp_in_stage_order(self):
        sheet = build_sheet({
            "A1": "NUMBER", "R1": "BOSS HP",
            "A2": 0, "A3": 1, "R3": 40, "A4": 2, "R4": 300,
        }, title="Stage Data")
        self.assertEqual(extract_stage_bosses(sheet), [40, 300])


class PromotionStages(unittest.TestCase):
    def test_recommended_stage_and_range_until_max_stage(self):
        sheet = build_sheet({
            "C265": "Promotion Recommended Stages",
            "C266": "Promotion", "I266": "Recommended", "U266": "Recommended Stage +-",
            "C267": "Stone", "I267": 0, "U267": 0,
            "C268": "Bronze", "I268": 10, "U268": 1,
            "C269": "MAX STAGE", "I269": 1860,
        }, title="STAT TRACKER")
        self.assertEqual(extract_promotion_stages(sheet), [
            {"name": "Stone", "stage": 0, "range": 0},
            {"name": "Bronze", "stage": 10, "range": 1},
        ])
