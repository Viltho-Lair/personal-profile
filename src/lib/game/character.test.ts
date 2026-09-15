import { describe, expect, it } from "vitest";
import data from "@/data/optimizer/character.json";
import {
  abilityRowOpen,
  awakenedClassName,
  classMaxLevel,
  diaryMaxLevel,
  skillPoints,
  growthMaxLevel,
  overPoints,
  maxDiaryUpgrades,
  enhanceMax,
  enhanceStat,
  latentMultiplier,
  latentPerLevel,
  type EnhanceStat,
} from "./character";

const stat = (name: string) => data.enhance.find((s) => s.name === name) as EnhanceStat;

describe("enhanceMax", () => {
  it("uses the sheet's fixed caps", () => {
    expect(enhanceMax(stat("ATK"), 0, undefined, undefined)).toBe(2_200_000);
  });

  it("keeps Death Strike at 1 until CRIT % is 1000, then Growing Knowledge + Superhuman", () => {
    const grades = data.growingKnowledge;
    expect(enhanceMax(stat("DEATH STRIKE"), 999, grades[5], grades[5])).toBe(1);
    expect(enhanceMax(stat("DEATH STRIKE"), 1000, grades[1], grades[2])).toBe(4050 + 90);
    expect(enhanceMax(stat("DEATH STRIKE %"), 1000, grades[0], grades[0])).toBe(1000);
  });
});

describe("enhanceStat", () => {
  it("multiplies the level by its tier (and HP by 10)", () => {
    expect(enhanceStat(stat("ATK").formula, 99)).toEqual({ value: 99, perLevel: 1 });
    expect(enhanceStat(stat("ATK").formula, 100)).toEqual({ value: 200, perLevel: 2 });
    expect(enhanceStat(stat("ATK").formula, 1_000_000)).toEqual({ value: 6_000_000, perLevel: 6 });
    expect(enhanceStat(stat("HP").formula, 1000)).toEqual({ value: 30_000, perLevel: 30 });
  });

  it("gives crit stats a fraction per level", () => {
    expect(enhanceStat(stat("CRIT %").formula, 1000).value).toBeCloseTo(1);
    expect(enhanceStat(stat("CRIT DMG").formula, 250).value).toBeCloseTo(2.5);
  });
});

describe("latent power", () => {
  it("looks up the awakened multiplier, 1 when not awakened", () => {
    expect(latentMultiplier(data.latentAwakening.stats, 0, 3)).toBe(1);
    expect(latentMultiplier(data.latentAwakening.stats, 1, 1)).toBe(1.02);
  });

  it("grows the base value with slayer level above 250 and the latent sum", () => {
    expect(latentPerLevel("STR", 5, 450, 20)).toBe(5 + (200 * 20) / 200);
    expect(latentPerLevel("HP", 30, 450, 20)).toBeCloseTo(30 * (1 + 0.2 * 20));
    expect(latentPerLevel("ACC", 3, 450, 20)).toBe(3);
  });
});

describe("classes and abilities", () => {
  it("awakening raises the class cap and renames the last class", () => {
    expect(classMaxLevel(18)).toBe(1100);
  });

  it("counts growth skill points from slayer level and unlocked Training Diary levels", () => {
    expect(diaryMaxLevel(399)).toBe(0);
    expect(diaryMaxLevel(400)).toBe(1);
    expect(diaryMaxLevel(2799)).toBe(24);
    expect(diaryMaxLevel(2800)).toBe(25);
    expect(skillPoints(2794, 24)).toEqual({ starting: 100, fromLevel: 8379, fromDiary: 2400, diary: 24, total: 10879 });
    // The game's total at slayer level 2,800 with diary 24.
    expect(skillPoints(2800, 24).total).toBe(10897);
    expect(skillPoints(1, 0).total).toBe(100);
    // A diary level the slayer hasn't unlocked yet doesn't count.
    expect(skillPoints(2794, 25).diary).toBe(24);
  });

  it("raises growth max levels with the Training Diary and Over Point upgrades", () => {
    expect(growthMaxLevel("STR", 0, 0)).toBe(1000);
    expect(growthMaxLevel("CRI", 0, 0)).toBe(200);
    // Each diary level opens 2 upgrades per stat: diary 24 takes 48, 1,000 + 1,200 + 1,200 = 3,400.
    expect(maxDiaryUpgrades(24)).toBe(48);
    expect(growthMaxLevel("STR", 24, 48)).toBe(3400);
    // Diary 22 opens only 44.
    expect(growthMaxLevel("STR", 22, 48)).toBe(1000 + 1100 + 1100);
    expect(growthMaxLevel("DODGE", 22, 99)).toBe(200 + 220 + 220);
    expect(overPoints(22, { STR: 48, CRI: 44, LUK: 38 })).toEqual({ total: 440, spent: 220 + 44 + 190, left: 440 - 454 });
    expect([0, 6, 12, 18].map(awakenedClassName)).toEqual(["Blast", "Tera", "Seed", "Nova"]);
  });

  it("opens ability rows as promotions pass them", () => {
    expect(abilityRowOpen(1, 0)).toBe(true);
    expect(abilityRowOpen(1, 1)).toBe(false);
    expect(abilityRowOpen(7, 6)).toBe(true);
  });
});
