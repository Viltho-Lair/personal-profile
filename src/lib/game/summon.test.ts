import { describe, expect, it } from "vitest";
import {
  awakeningCost,
  awakeningReach,
  awakeningStepCost,
  drawSummon,
  GRADE_CHANCES,
  rewardsBetween,
  SUMMON_CHANCES,
  summon,
  summonPosition,
  summonsToNext,
  SUMMON_RARITIES,
} from "./summon";

/** Rolls the numbers given, in order, then 0. */
const rolls = (...values: number[]) => {
  let i = 0;
  return () => values[i++] ?? 0;
};

describe("summon chances", () => {
  it("adds up to 100% at every level, grades included", () => {
    for (const level of Object.keys(SUMMON_CHANCES).map(Number)) {
      const total = SUMMON_RARITIES.reduce((sum, rarity) => sum + SUMMON_CHANCES[level]![rarity], 0);
      expect(total).toBeCloseTo(100, 6);
    }
    expect(GRADE_CHANCES.reduce((sum, entry) => sum + entry.chance, 0)).toBe(100);
  });
});

describe("drawSummon", () => {
  it("picks the rarity and grade the roll lands in", () => {
    // Level 1: Common is the first 68.58%, then Great; grades run 4, 3, 2, 1.
    expect(drawSummon(1, rolls(0, 0))).toEqual({ rarity: "Common", grade: 4, name: "Common 4" });
    expect(drawSummon(1, rolls(0.9, 0.95))).toEqual({ rarity: "Great", grade: 1, name: "Great 1" });
    // The last 0.0001% of level 1 is Mythic.
    expect(drawSummon(1, rolls(0.999999999, 0.5)).rarity).toBe("Mythic");
  });
});

describe("summon", () => {
  it("counts every summon toward the level", () => {
    const run = summon({ level: 1, progress: 0 }, 5, rolls());
    expect(run.summons).toBe(5);
    expect(run.state.progress).toBe(5);
    expect(run.drawn["Common 4"]).toBe(5);
  });

  it("carries the summons over into the next level", () => {
    // 100 summons finish level 1 exactly; the 101st starts level 2.
    expect(summon({ level: 1, progress: 99 }, 2, rolls()).state).toMatchObject({ level: 2, progress: 1 });
    expect(summonsToNext(1)).toBe(100);
    expect(summonsToNext(10)).toBeNull();
    // Level 10 has nowhere to go, so its progress just counts on.
    expect(summon({ level: 10, progress: 5 }, 3, rolls()).state).toMatchObject({ level: 10, progress: 8 });
  });

  it("gives Ellie's Summon Gift Box at each milestone passed, but not for levels already reached", () => {
    // Reaching level 5 gives 1 Mythic Grade 1.
    const toFive = summon({ level: 4, progress: 4799 }, 1, rolls());
    expect(toFive.state.level).toBe(5);
    expect(toFive.rewards).toEqual([{ at: 5, mythicG1: 1 }]);
    expect(toFive.drawn["Mythic 1"]).toBe(1);
    // Half of level 7 (27,500) gives 3, and level 8 gives 4.
    expect(rewardsBetween(7, 7.5)).toEqual([{ at: 7.5, mythicG1: 3 }]);
    expect(rewardsBetween(7.4, 8)).toEqual([
      { at: 7.5, mythicG1: 3 },
      { at: 8, mythicG1: 4 },
    ]);
    // Starting at level 8 means every earlier box is already collected.
    expect(rewardsBetween(summonPosition(8, 0), summonPosition(8, 88000))).toEqual([]);
    expect(summonPosition(7, 27500)).toBe(7.5);
  });

  it("counts a batch of 33 and leaves the state ready for the next one", () => {
    const first = summon({ level: 3, progress: 0 }, 33, rolls());
    expect(first.summons).toBe(33);
    expect(first.state).toMatchObject({ level: 3, progress: 33 });
    expect(summon(first.state, 33, rolls()).state).toMatchObject({ progress: 66 });
  });
});

describe("awakening", () => {
  it("charges a Mythic Grade 1 a star, four where the look changes, and shards at the end", () => {
    expect(awakeningStepCost(1)).toEqual({ mythicG1: 1, shards: 0 });
    expect(awakeningStepCost(6)).toEqual({ mythicG1: 4, shards: 0 });
    expect(awakeningStepCost(18)).toEqual({ mythicG1: 4, shards: 0 });
    expect(awakeningStepCost(23)).toEqual({ mythicG1: 1, shards: 0 });
    expect(awakeningStepCost(24)).toEqual({ mythicG1: 0, shards: 10_000 });
    expect(awakeningStepCost(25)).toEqual({ mythicG1: 1, shards: 1_000 });
    expect(awakeningStepCost(29)).toEqual({ mythicG1: 1, shards: 1_000 });
    expect(awakeningStepCost(30)).toEqual({ mythicG1: 0, shards: 10_000 });
  });

  it("adds up what a stretch of stars takes", () => {
    // 0 to 30: 20 single stars, 3 of four, 5 with shards = 37 Mythic Grade 1 and 25,000 shards.
    expect(awakeningCost(0, 30)).toEqual({ mythicG1: 37, shards: 25_000 });
    expect(awakeningCost(0, 5)).toEqual({ mythicG1: 5, shards: 0 });
    expect(awakeningCost(5, 6)).toEqual({ mythicG1: 4, shards: 0 });
    expect(awakeningCost(23, 24)).toEqual({ mythicG1: 0, shards: 10_000 });
  });

  it("says how far what you hold awakens it, and what the next star is short of", () => {
    // 5 Mythic Grade 1 take 0 to 5 stars; the 6th needs 4 more.
    const five = awakeningReach(0, 5, 0);
    expect(five).toMatchObject({ star: 5, stars: 5, mythicLeft: 0 });
    expect(five.short).toEqual({ mythicG1: 4, shards: 0 });
    // At 23 stars only shards go further.
    expect(awakeningReach(23, 10, 0).star).toBe(23);
    expect(awakeningReach(23, 10, 10_000)).toMatchObject({ star: 24, shardsLeft: 0 });
    expect(awakeningReach(23, 1, 11_000)).toMatchObject({ star: 25, mythicLeft: 0, shardsLeft: 0 });
  });
});
