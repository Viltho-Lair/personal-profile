import { describe, expect, it } from "vitest";
import {
  bundleOf,
  CLASS_SUMMON_CHANCES,
  clampBar,
  diamondsFor,
  emptyClassSim,
  estimateClass,
  expectedSummons,
  levelStep,
  rewardIn,
  rollGrade,
  summonClasses,
  summonsToOwn,
  mergeClasses,
  NOVA_DARK_RAINS,
  NOVA_PATH,
  copiesOwned,
  goalCopies,
  rewardCap,
  seeded,
  ownsClass,
} from "./class-summon";

const START = { level: 0, progress: 0 };
const TOP = { level: 9, progress: 0 };

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

describe("the reward bar", () => {
  it("levels up by the game's table, then gives a grade 19 every 3,000", () => {
    expect(levelStep(0)).toEqual({ summons: 100, reward: 10 });
    expect(levelStep(5)).toEqual({ summons: 700, reward: 15 });
    expect(levelStep(8)).toEqual({ summons: 2000, reward: 18 });
    expect(levelStep(9)).toEqual({ summons: 3000, reward: 19 });
    expect(levelStep(13)).toEqual({ summons: 3000, reward: 19 });
  });

  it("counts the summons to the level up that gives a grade", () => {
    expect(rewardIn(10, START)).toBe(100);
    expect(rewardIn(11, START)).toBe(300);
    expect(rewardIn(18, START)).toBe(6700);
    expect(rewardIn(19, START)).toBe(9700);
    expect(rewardIn(19, { level: 9, progress: 2081 })).toBe(919);
    // Levels already past, and grades the bar never gives.
    expect(rewardIn(10, { level: 1, progress: 0 })).toBe(Infinity);
    expect(rewardIn(18, TOP)).toBe(Infinity);
    expect(rewardIn(9, START)).toBe(Infinity);
  });

  it("keeps the bar short of its level up", () => {
    expect(clampBar({ level: 0, progress: 500 })).toEqual({ level: 0, progress: 99 });
    expect(clampBar({ level: -2, progress: -5 })).toEqual(START);
  });
});

describe("expected summons", () => {
  it("is 1 / chance for a grade the bar doesn't give", () => {
    expect(expectedSummons(1)).toBeCloseTo(1 / 0.0876, 6);
    expect(expectedSummons(18, TOP)).toBeCloseTo(5000, 6);
  });

  it("is capped by the level up that gives the grade", () => {
    expect(expectedSummons(19, TOP)).toBeCloseTo((1 - 0.9999 ** 3000) / 0.0001, 6);
    expect(expectedSummons(19, START)).toBeCloseTo((1 - 0.9999 ** 9700) / 0.0001, 6);
    expect(expectedSummons(10, START)).toBeCloseTo((1 - 0.966 ** 100) / 0.034, 6);
    expect(expectedSummons(19, { level: 9, progress: 2999 })).toBeCloseTo(1, 6);
  });
});

describe("merging", () => {
  it("merges five of a grade into one of the next, up to Dark Rain", () => {
    const owned = Array(19).fill(0);
    owned[0] = 26;
    const merged = mergeClasses(owned);
    expect(merged.slice(0, 3)).toEqual([1, 0, 1]);
    const top = Array(19).fill(0);
    top[17] = 5;
    top[18] = 4;
    expect(mergeClasses(top).slice(17)).toEqual([0, 5]);
    expect(mergeClasses(top)).toHaveLength(19);
  });

  it("owns a class once the lower ones merge into it", () => {
    const owned = Array(19).fill(0);
    owned[2] = 4;
    owned[1] = 5;
    expect(ownsClass(owned, 4)).toBe(true);
    expect(ownsClass(owned, 5)).toBe(false);
  });

  it("stops a run at the draw, the reward or the merge that gives the class", () => {
    // Every roll is grade 1: 5 make a grade 2.
    expect(summonsToOwn(2, TOP, () => 0)).toBe(5);
    // The bar gives grade 10 at 100 summons, before 5^9 grade 1s could merge into it.
    expect(summonsToOwn(10, START, () => 0)).toBe(100);
  });
});

describe("the way to Nova", () => {
  it("takes 28 Dark Rains and 10,000 shards", () => {
    expect(NOVA_PATH.map((step) => step.darkRains)).toEqual([5, 5, 4, 5, 4, 5, 0]);
    expect(NOVA_DARK_RAINS).toBe(28);
    expect(NOVA_PATH.at(-1)).toEqual({ to: "Nova", darkRains: 0, shards: 10_000 });
    expect(goalCopies("nova")).toBe(28);
    expect(goalCopies(12)).toBe(1);
  });

  it("counts the classes owned by what they merge into", () => {
    const owned = Array(19).fill(0);
    owned[18] = 3;
    owned[17] = 10;
    expect(copiesOwned(owned, 19)).toBe(5);
    expect(ownsClass(owned, 19, 5)).toBe(true);
    expect(ownsClass(owned, 19, 6)).toBe(false);
  });

  it("is never slower than the reward bar giving every Dark Rain", () => {
    // 28 Dark Rains at 3,000 summons each from level 9, less what the run has merged up along the way.
    const cap = rewardCap(19, TOP, 28);
    expect(cap).toBeLessThanOrEqual(28 * 3000);
    expect(cap).toBeGreaterThan(27 * 3000);
    expect(rewardCap(19, TOP)).toBe(3000);
    expect(rewardCap(18, TOP)).toBe(Infinity);
    expect(summonsToOwn(19, TOP, seeded(7), 28)).toBeLessThanOrEqual(cap);
  });
});

describe("estimateClass", () => {
  it("comes out the same every time", () => {
    expect(estimateClass(12, START, 200)).toEqual(estimateClass(12, START, 200));
  });

  it("is quicker with merging than without", () => {
    const withMerging = estimateClass(18, TOP, 400);
    expect(withMerging.summons).toBeLessThan(expectedSummons(18, TOP));
    expect(withMerging.median.summons).toBeLessThanOrEqual(withMerging.likely.summons);
  });

  it("never takes more than the reward bar", () => {
    const darkRain = estimateClass(19, START, 200);
    expect(darkRain.likely.summons).toBeLessThanOrEqual(9700);
    expect(darkRain.cap?.summons).toBe(9700);
  });

  it("adds one bonus summon to x10 a summon level, up to +10 at level 9", () => {
    expect(bundleOf(0)).toEqual({ summons: 11, diamonds: 3000 });
    expect(bundleOf(8)).toEqual({ summons: 19, diamonds: 3000 });
    expect(bundleOf(9)).toEqual({ summons: 20, diamonds: 3000 });
    expect(bundleOf(13)).toEqual({ summons: 20, diamonds: 3000 });
  });

  it("prices each level's summons in that level's bundle", () => {
    expect(diamondsFor(22, START)).toBe(6000);
    // 100 at level 0 (11 a bundle), then 24 at level 1 (12 a bundle).
    expect(diamondsFor(124, START)).toBeCloseTo((100 / 11) * 3000 + (24 / 12) * 3000, 6);
    expect(diamondsFor(40, TOP)).toBe(6000);
    const nova = estimateClass("nova", TOP);
    expect(nova.grade).toBe(19);
    expect(nova.shards).toBe(10_000);
    expect(nova.diamonds).toBeCloseTo((nova.summons / 20) * 3000, 6);
    expect(nova.cap?.summons).toBe(rewardCap(19, TOP, NOVA_DARK_RAINS));
    expect(estimateClass(5).cap).toBeNull();
  });
});

describe("summoning", () => {
  it("counts diamonds and gives each level up's class", () => {
    const result = summonClasses(emptyClassSim({ level: 0, progress: 95 }), 11, 3000, () => 0);
    expect(result.rewards).toEqual([10]);
    expect(result.sim.bar).toEqual({ level: 1, progress: 6 });
    expect(result.sim.owned[0]).toBe(11);
    expect(result.sim.owned[9]).toBe(1);
    expect(result.sim.summons).toBe(11);
    expect(result.sim.diamonds).toBe(3000);
  });

  it("gives a grade 19 every 3,000 from level 9", () => {
    const result = summonClasses(emptyClassSim({ level: 9, progress: 2995 }), 3010, 0, () => 0);
    expect(result.rewards).toEqual([19, 19]);
    expect(result.sim.bar).toEqual({ level: 11, progress: 5 });
  });
});
