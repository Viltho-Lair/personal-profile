import { describe, expect, it } from "vitest";
import { buildPath, mergeSteps, nextStep, stepScore, type PathCandidate } from "./plan-path";

/** A curve from `min` to `max`: a step's size is the part of it covered. */
const curve = (id: string, current: number, max: number, min = 0): PathCandidate => ({ id, current, max, size: (from, to) => (to - from) / (max - min) });

describe("next step", () => {
  it("covers the fewest levels that make up the unit of the curve", () => {
    expect(nextStep(curve("a", 0, 100), 0, 0.05)).toBe(5);
    expect(nextStep(curve("a", 0, 11), 0, 0.05)).toBe(1);
  });

  it("goes the rest of the way when that's less than the unit, and stops at the max", () => {
    expect(nextStep(curve("a", 98, 100), 98, 0.05)).toBe(100);
    expect(nextStep(curve("a", 100, 100), 100, 0.05)).toBe(100);
  });
});

describe("path", () => {
  it("scores the slope, a step of no size first", () => {
    expect(stepScore(2, 0)).toBe(Infinity);
    expect(stepScore(2, 1)).toBeCloseTo(Math.log(2));
    expect(stepScore(1.1, 0.01)).toBeGreaterThan(stepScore(2, 1));
  });

  it("climbs the steepest curve first and stops once the enemy falls", () => {
    // Stars: each of 11 lifts damage 20%. Levels: each of 1000 lifts it 0.1%, so a 5% stretch is only about 5%.
    const stars = curve("stars", 0, 11);
    const levels = curve("levels", 0, 1000);
    const fight = (at: Record<string, number>) => {
      const own = 1.2 ** at.stars! * 1.001 ** at.levels!;
      return { own, total: own };
    };
    const path = buildPath({ candidates: [stars, levels], fight, hp: 3 });
    expect(path.won).toBe(true);
    expect(path.total).toBeGreaterThanOrEqual(3);
    expect(path.steps[0]!.id).toBe("stars");
    expect(path.levels.levels).toBe(0);
  });

  it("moves on to the next curve as the first one flattens", () => {
    // Stars stop adding after 3; levels keep going.
    const stars = curve("stars", 0, 11);
    const levels = curve("levels", 0, 1000);
    const fight = (at: Record<string, number>) => {
      const own = 1.2 ** Math.min(3, at.stars!) * 1.001 ** at.levels!;
      return { own, total: own };
    };
    const path = buildPath({ candidates: [stars, levels], fight, hp: 3 });
    expect(path.won).toBe(true);
    expect(path.levels.stars).toBe(3);
    expect(path.levels.levels).toBeGreaterThan(0);
  });

  it("spends no more than its budget, short of the enemy", () => {
    // Each level costs a tenth of the budget and adds 10%.
    const priced: PathCandidate = { ...curve("a", 0, 100), spend: (from, to) => (to - from) * 0.1 };
    const fight = (at: Record<string, number>) => ({ own: 1.1 ** at.a!, total: 1.1 ** at.a! });
    const path = buildPath({ candidates: [priced], fight, hp: 1e9, maxSpend: 1 });
    expect(path.won).toBe(false);
    expect(path.levels.a).toBe(10);
    expect(path.spent).toBeCloseTo(1);
  });

  it("ends without winning when nothing adds damage", () => {
    const path = buildPath({ candidates: [curve("a", 0, 10)], fight: () => ({ own: 1, total: 1 }), hp: 2 });
    expect(path.won).toBe(false);
    expect(path.steps).toEqual([]);
  });

  it("merges an upgrade's steps from its first level to its last, in the order first taken", () => {
    expect(
      mergeSteps([
        { id: "a", from: 0, to: 5, size: 0.1, gain: 1.1 },
        { id: "b", from: 3, to: 4, size: 0.1, gain: 1.1 },
        { id: "a", from: 5, to: 9, size: 0.1, gain: 1.1 },
      ]),
    ).toEqual([
      { id: "a", from: 0, to: 9 },
      { id: "b", from: 3, to: 4 },
    ]);
  });
});
