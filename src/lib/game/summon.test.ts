import { describe, expect, it } from "vitest";
import {
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
  it("spends a shard a summon and stops when they run out", () => {
    const run = summon({ level: 1, progress: 0, shards: 5 }, 33, rolls());
    expect(run.summons).toBe(5);
    expect(run.state.shards).toBe(0);
    expect(run.stopped).toBe("shards");
    expect(run.state.progress).toBe(5);
    expect(run.drawn["Common 4"]).toBe(5);
  });

  it("carries the summons over into the next level", () => {
    // 100 summons finish level 1 exactly; the 101st starts level 2.
    expect(summon({ level: 1, progress: 99, shards: 99 }, 2, rolls()).state).toMatchObject({ level: 2, progress: 1 });
    expect(summonsToNext(1)).toBe(100);
    expect(summonsToNext(10)).toBeNull();
    // Level 10 has nowhere to go, so its progress just counts on.
    expect(summon({ level: 10, progress: 5, shards: 3 }, 3, rolls()).state).toMatchObject({ level: 10, progress: 8 });
  });

  it("gives Ellie's Summon Gift Box at each milestone passed, but not for levels already reached", () => {
    // Reaching level 5 gives 1 Mythic Grade 1.
    const toFive = summon({ level: 4, progress: 4799, shards: 1 }, 1, rolls());
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
    const first = summon({ level: 3, progress: 0, shards: 100 }, 33, rolls());
    expect(first).toMatchObject({ summons: 33, stopped: null });
    expect(first.state).toMatchObject({ level: 3, progress: 33, shards: 67 });
    const second = summon(first.state, 33, rolls());
    expect(second.state).toMatchObject({ progress: 66, shards: 34 });
  });
});
