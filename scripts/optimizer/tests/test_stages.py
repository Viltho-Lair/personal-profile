import unittest

from optimizer.stages import extract_promotion_stages, extract_stage_bosses, extract_stage_farms
from optimizer.tests.support import build_sheet


class StageBosses(unittest.TestCase):
    def test_boss_hp_in_stage_order(self):
        sheet = build_sheet({
            "A1": "NUMBER", "R1": "BOSS HP",
            "A2": 0, "A3": 1, "R3": 40, "A4": 2, "R4": 300,
        }, title="Stage Data")
        self.assertEqual(extract_stage_bosses(sheet), [40, 300])


class StageFarms(unittest.TestCase):
    def test_monsters_per_wave_and_hp_in_stage_order(self):
        sheet = build_sheet({
            "A1": "NUMBER", "E1": "Full Stage Name", "F1": "MOBS", "Q1": "BOSS HP", "S1": "ENEMY HP",
            "A2": 0, "E2": "-", "F2": "-",
            "A3": 1, "E3": "Beginning Forest - I", "F3": 1, "Q3": 40, "S3": 2,
            "A4": 2, "E4": "Beginner's Ground - I", "F4": 4, "Q4": 300, "S4": 30,
        }, title="Stage Data")
        self.assertEqual(extract_stage_farms(sheet), [
            {"stage": 1, "name": "Beginning Forest - I", "mobs": 1, "enemyHp": 2, "bossHp": 40},
            {"stage": 2, "name": "Beginner's Ground - I", "mobs": 4, "enemyHp": 30, "bossHp": 300},
        ])


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
