import { describe, expect, it } from "vitest";
import {
  bundleOf,
  CLASS_PITY_EVERY,
  CLASS_SUMMON_CHANCES,
  diamondsFor,
  emptyClassSim,
  estimateClass,
  expectedSummons,
  rollGrade,
  summonClasses,
  summonsForOdds,
} from "./class-summon";

describe("class summon chances", () => {
  it("add up to 100% over grades 1-19, with grade 20 at 0%", () => {
    expect(CLASS_SUMMON_CHANCES).toHaveLength(20);
    expect(CLASS_SUMMON_CHANCES.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 6);
    expect(CLASS_SUMMON_CHANCES[19]).toBe(0);
  });

  it("roll into grades by the listed chances", () => {
    expect(rollGrade(0)).toBe(1);
    expect(rollGrade(0.0875)).toBe(1);
    expect(rollGrade(0.0877)).toBe(2);
    expect(rollGrade(0.99995)).toBe(19);
  });
});

describe("expected summons", () => {
  it("is 1 / chance for a grade the reward bar doesn't give", () => {
    expect(expectedSummons(1)).toBeCloseTo(1 / 0.0876, 6);
    expect(expectedSummons(18)).toBeCloseTo(5000, 6);
  });

  it("caps grade 19 with the reward bar", () => {
    // 0.01% a summon, but the bar pays out by 3,000.
    const full = (1 - 0.9999 ** 3000) / 0.0001;
    expect(expectedSummons(19)).toBeCloseTo(full, 6);
    expect(expectedSummons(19)).toBeLessThan(3000);
    expect(expectedSummons(19, 2999)).toBeCloseTo(1, 6);
    expect(summonsForOdds(19, 0.9)).toBe(CLASS_PITY_EVERY);
    expect(summonsForOdds(19, 0.9, 2081)).toBe(919);
  });

  it("prices summons in bundles of 10 plus the bonus", () => {
    expect(bundleOf(1)).toEqual({ summons: 11, diamonds: 3000 });
    expect(diamondsFor(22, 1)).toBe(6000);
    const nova = estimateClass("nova", 1);
    expect(nova.grade).toBe(19);
    expect(nova.shards).toBe(10_000);
    expect(nova.diamonds).toBeCloseTo((nova.summons / 11) * 3000, 6);
  });
});

describe("summoning", () => {
  it("counts diamonds and pays out a grade 19 as the reward bar fills", () => {
    const sim = { ...emptyClassSim(2995) };
    const result = summonClasses(sim, 11, 3000, () => 0);
    expect(result.rewards).toBe(1);
    expect(result.sim.pity).toBe(6);
    expect(result.sim.owned[0]).toBe(11);
    expect(result.sim.owned[18]).toBe(1);
    expect(result.sim.summons).toBe(11);
    expect(result.sim.diamonds).toBe(3000);
  });
});
