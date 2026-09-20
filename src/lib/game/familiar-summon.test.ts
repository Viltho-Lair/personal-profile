import { describe, expect, it } from "vitest";
import {
  bestStar,
  combineOnce,
  combineUp,
  COMBINE_BONUS,
  COMBINE_GAUGE,
  COMBINE_SLOTS,
  copiesNeeded,
  diamondsFor,
  drawFamiliar,
  emptyFamiliarSim,
  estimateFamiliar,
  FAMILIAR_BATCH,
  FAMILIAR_SUMMON_CHANCES,
  FAMILIAR_SUMMON_COSTS,
  fodderBar,
  fodderFor,
  fodderSets,
  gaugeFor,
  GROUP_SIZE,
  MAX_COMBINE_STAR,
  MAX_SUMMON_STAR,
  playFamiliar,
  ROSTER_SIZE,
  sameChance,
  seeded,
  selfChance,
  selfOnlyFodder,
  STAR_COST,
  SUMMON_BONUS,
  summonFamiliars,
} from "./familiar-summon";

const GROUP = ["Hi", "Ti", "A", "Je"];
const ROSTER = [...GROUP, "Pe", "Ku", "Sha", "Po", "Mus", "Na", "Rion", "Ru"];

describe("the summon rates", () => {
  it("add up to 100% over 0★ to 8★, as the Probabilities screen lists them", () => {
    expect(FAMILIAR_SUMMON_CHANCES).toHaveLength(9);
    expect(MAX_SUMMON_STAR).toBe(8);
    expect(FAMILIAR_SUMMON_CHANCES.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 6);
  });

  it("costs 500 diamonds for one and 5,000 for eleven", () => {
    expect(FAMILIAR_SUMMON_COSTS[0]).toEqual({ summons: 1, diamonds: 500 });
    expect(FAMILIAR_BATCH).toEqual({ summons: 11, diamonds: 5000 });
    // The bundle is the cheaper way in.
    expect(FAMILIAR_BATCH.diamonds / FAMILIAR_BATCH.summons).toBeLessThan(500);
    expect(diamondsFor(12)).toBe(2 * FAMILIAR_BATCH.diamonds);
    expect(diamondsFor(0)).toBe(0);
  });
});

describe("the combine bar", () => {
  it("fills at the game's rates, with same type worth half of self type", () => {
    expect(selfChance(0)).toBe(100);
    expect(selfChance(1)).toBe(50);
    expect(selfChance(6)).toBe(50);
    expect(selfChance(7)).toBe(25);
    expect(selfChance(8)).toBe(25);
    expect(selfChance(9)).toBe(100);
    for (let star = 0; star < MAX_COMBINE_STAR; star += 1) expect(sameChance(star)).toBe(selfChance(star) / 2);
  });

  it("adds a slot's chance for each of the five", () => {
    expect(fodderBar(1, { self: 2, same: 0 })).toBe(100);
    expect(fodderBar(1, { self: 0, same: 4 })).toBe(100);
    expect(fodderBar(1, { self: 1, same: 2 })).toBe(100);
    expect(fodderBar(7, { self: 0, same: COMBINE_SLOTS })).toBe(62.5);
  });

  it("offers the fodder sets that fill it without a wasted slot", () => {
    expect(fodderSets(0)).toEqual([
      { self: 0, same: 2 },
      { self: 1, same: 0 },
    ]);
    expect(fodderSets(1)).toEqual([
      { self: 0, same: 4 },
      { self: 1, same: 2 },
      { self: 2, same: 0 },
    ]);
    expect(fodderSets(9)).toEqual(fodderSets(0));
  });

  it("can't fill 7★ or 8★ on same type alone, since five only reach 62.5%", () => {
    for (const star of [7, 8]) {
      expect(fodderSets(star)).toEqual([
        { self: 3, same: 2 },
        { self: 4, same: 0 },
      ]);
      // Both modes have to spend copies of the familiar itself at these two steps.
      expect(fodderFor(star, "same").self).toBeGreaterThan(0);
      expect(fodderFor(star, "self").self).toBeGreaterThan(0);
    }
  });

  it("never asks for more than the five slots hold", () => {
    for (let star = 0; star < MAX_COMBINE_STAR; star += 1) {
      for (const set of fodderSets(star)) {
        expect(set.self + set.same).toBeLessThanOrEqual(COMBINE_SLOTS);
        expect(fodderBar(star, set)).toBeGreaterThanOrEqual(100);
      }
    }
  });

  it("gives each mode its end of the sets", () => {
    expect(fodderFor(1, "self")).toEqual({ self: 2, same: 0 });
    expect(fodderFor(1, "same")).toEqual({ self: 0, same: 4 });
    expect(fodderFor(7, "self")).toEqual({ self: 4, same: 0 });
    expect(fodderFor(7, "same")).toEqual({ self: 3, same: 2 });
  });

  it("takes 1, 2 or 4 copies of the familiar itself when nothing else helps", () => {
    expect([0, 1, 7, 9].map(selfOnlyFodder)).toEqual([1, 2, 4, 1]);
  });
});

describe("the combine gauge", () => {
  it("only moves for 7★, 8★ and 9★ materials", () => {
    for (let star = 0; star < 7; star += 1) expect(gaugeFor(star)).toEqual({ fail: 0, success: 0 });
    expect(gaugeFor(7)).toEqual({ fail: 48, success: 516 });
    expect(gaugeFor(8)).toEqual({ fail: 172, success: 900 });
    expect(gaugeFor(9)).toEqual({ fail: 900, success: 0 });
    expect(COMBINE_GAUGE).toHaveLength(MAX_COMBINE_STAR);
  });

  it("gives a 7★ for every 300 it fills", () => {
    const sim = emptyFamiliarSim(ROSTER);
    sim.copies.Hi![7] = 5;
    // One 7★ combine is 516, which is one pick over and 216 carried.
    const next = combineOnce(sim, "Hi", 7, GROUP, { self: 4, same: 0 })!;
    expect(next.picks.combine).toBe(1);
    expect(next.gauge).toBe(516 - COMBINE_BONUS.full);
    expect(next.copies.Hi![COMBINE_BONUS.star]).toBe(1);
    expect(next.copies.Hi![8]).toBe(1);
  });

  it("gives nothing for a combine below 7★", () => {
    const sim = emptyFamiliarSim(ROSTER);
    sim.copies.Hi![3] = 3;
    const next = combineOnce(sim, "Hi", 3, GROUP, { self: 2, same: 0 })!;
    expect(next.gauge).toBe(0);
    expect(next.picks.combine).toBe(0);
  });

  it("hands its pick to the familiar being raised, not the one combined", () => {
    const sim = emptyFamiliarSim(ROSTER);
    sim.copies.Ti![7] = 5;
    const next = combineOnce(sim, "Ti", 7, GROUP, { self: 4, same: 0 }, "Hi")!;
    expect(next.copies.Hi![COMBINE_BONUS.star]).toBe(1);
  });
});

describe("what a star is worth", () => {
  it("counts a 10★ fed only its own copies as 72,900 at 0★", () => {
    expect(STAR_COST[0]).toBe(1);
    expect(STAR_COST[1]).toBe(2);
    expect(STAR_COST[7]).toBe(1458);
    expect(STAR_COST[MAX_COMBINE_STAR]).toBe(72_900);
  });

  it("multiplies by the copy itself plus its self fodder at every star", () => {
    for (let star = 0; star < MAX_COMBINE_STAR; star += 1) {
      expect(STAR_COST[star + 1]).toBe(STAR_COST[star]! * (1 + selfOnlyFodder(star)));
    }
  });
});

describe("the copies a goal takes", () => {
  it("spends nothing on the group in self mode", () => {
    const needs = copiesNeeded(MAX_COMBINE_STAR, "self");
    expect(needs.kin.every((count) => count === 0)).toBe(true);
    expect(needs.own[0]).toBe(STAR_COST[MAX_COMBINE_STAR]);
    expect(needs.own[MAX_COMBINE_STAR]).toBe(1);
  });

  it("trades its own copies for the group's in same mode", () => {
    const needs = copiesNeeded(MAX_COMBINE_STAR, "same");
    // Only the 7★ and 8★ steps still want copies of the familiar itself, so 16 of them carry the whole way.
    expect(needs.own[0]).toBe(16);
    expect(needs.kin[0]).toBeGreaterThan(needs.own[0]!);
  });

  it("wants one copy at the goal star and nothing above it", () => {
    for (const mode of ["self", "same"] as const) {
      for (const to of [1, 5, MAX_COMBINE_STAR]) {
        const needs = copiesNeeded(to, mode);
        expect(needs.own[to]).toBe(1);
        expect(needs.kin[to]).toBe(0);
        expect(needs.plan).toHaveLength(to);
      }
    }
  });
});

describe("estimating a goal", () => {
  it("asks for nothing when the familiar is already there", () => {
    const estimate = estimateFamiliar(10, 10, "self");
    expect(estimate.summons).toBe(0);
    expect(estimate.diamonds).toBe(0);
    expect(estimate.combines).toBe(0);
  });

  it("stops at 10★, since the 11th star takes an awakening", () => {
    expect(estimateFamiliar(0, 11, "self").to).toBe(MAX_COMBINE_STAR);
    expect(estimateFamiliar(0, 99, "self").to).toBe(MAX_COMBINE_STAR);
  });

  it("costs more the further the goal is", () => {
    for (const mode of ["self", "same"] as const) {
      let last = -1;
      for (let star = 0; star <= MAX_COMBINE_STAR; star += 1) {
        const estimate = estimateFamiliar(0, star, mode);
        expect(estimate.summons).toBeGreaterThan(last);
        last = estimate.summons;
      }
    }
  });

  it("costs less the further along the familiar already is", () => {
    const scratch = estimateFamiliar(0, MAX_COMBINE_STAR, "self").summons;
    const nearly = estimateFamiliar(9, MAX_COMBINE_STAR, "self").summons;
    expect(nearly).toBeLessThan(scratch);
  });

  it("reaches 6★ on the summon gauge alone, inside its 300 summons", () => {
    // Every 300 summons hands over a 6★ of the familiar you pick, so nothing up to 6★ can cost more than that.
    for (let star = 1; star <= SUMMON_BONUS.star; star += 1) {
      expect(estimateFamiliar(0, star, "self").summons).toBeLessThanOrEqual(SUMMON_BONUS.full);
    }
  });

  it("makes same type dearer than self type once the group has to be raised too", () => {
    const self = estimateFamiliar(0, MAX_COMBINE_STAR, "self");
    const same = estimateFamiliar(0, MAX_COMBINE_STAR, "same");
    expect(same.summons).toBeGreaterThan(self.summons);
  });

  it("buys its summons in bundles of eleven", () => {
    const estimate = estimateFamiliar(0, 8, "self");
    expect(estimate.batches).toBe(Math.ceil(estimate.summons / FAMILIAR_BATCH.summons));
    expect(estimate.diamonds).toBe(estimate.batches * FAMILIAR_BATCH.diamonds);
  });

  it("gets a 6★ for every 300 summons it makes", () => {
    const estimate = estimateFamiliar(0, MAX_COMBINE_STAR, "self");
    expect(estimate.summonPicks).toBe(Math.floor(estimate.summons / SUMMON_BONUS.full));
    expect(estimate.combinePicks).toBeGreaterThan(0);
  });

  it("summons one copy of the goal familiar in twelve", () => {
    const estimate = estimateFamiliar(0, MAX_COMBINE_STAR, "self");
    expect(estimate.copies).toBe(Math.round(estimate.summons / ROSTER_SIZE));
  });

  it("puts the median and the nine-in-ten run either side of the average", () => {
    const estimate = estimateFamiliar(0, 9, "self");
    expect(estimate.runs).toBeGreaterThan(1);
    expect(estimate.median.summons).toBeLessThanOrEqual(estimate.likely.summons);
    expect(estimate.likely.diamonds).toBe(diamondsFor(estimate.likely.summons));
  });

  it("finishes every goal inside the summons a run is allowed", () => {
    for (const mode of ["self", "same"] as const) {
      expect(estimateFamiliar(0, MAX_COMBINE_STAR, mode).beyond).toBe(false);
    }
  });

  it("comes out the same every time it's asked", () => {
    expect(estimateFamiliar(0, 9, "same")).toEqual(estimateFamiliar(0, 9, "same"));
  });
});

describe("one run of a goal", () => {
  it("asks for nothing when the familiar starts at the goal", () => {
    expect(playFamiliar(5, 5, "self", seeded(1))).toEqual({ summons: 0, combines: 0, picks: { summon: 0, combine: 0 } });
  });

  it("costs less the further along the familiar starts", () => {
    const scratch = playFamiliar(0, 9, "self", seeded(11)).summons;
    const part = playFamiliar(8, 9, "self", seeded(11)).summons;
    expect(part).toBeLessThan(scratch);
  });

  it("waits for the gauge rather than combining for a goal it hands over whole", () => {
    const play = playFamiliar(0, SUMMON_BONUS.star, "self", seeded(3));
    expect(play.summons).toBeLessThanOrEqual(SUMMON_BONUS.full);
  });
});

describe("summoning", () => {
  it("draws a star by the chances, then one of the familiars", () => {
    const low = [0, 0];
    const high = [0.99999, 0];
    expect(drawFamiliar(ROSTER, () => low.shift() ?? 0).star).toBe(0);
    expect(drawFamiliar(ROSTER, () => high.shift() ?? 0).star).toBe(MAX_SUMMON_STAR);
  });

  it("hands the familiar you are raising a 6★ every 300 summons", () => {
    const run = summonFamiliars(emptyFamiliarSim(ROSTER), SUMMON_BONUS.full * 2, 0, ROSTER, "Hi", seeded(7));
    expect(run.bonuses).toBe(2);
    expect(run.sim.picks.summon).toBe(2);
    // Both picks went to Hi, on top of whatever the draws gave it.
    expect(run.sim.copies.Hi![SUMMON_BONUS.star]).toBeGreaterThanOrEqual(2);
    expect(run.sim.summons).toBe(SUMMON_BONUS.full * 2);
  });

  it("picks the gauge up where the last run left off", () => {
    const first = summonFamiliars(emptyFamiliarSim(ROSTER), SUMMON_BONUS.full - 1, 0, ROSTER, "Hi", seeded(3));
    expect(first.bonuses).toBe(0);
    expect(summonFamiliars(first.sim, 1, 0, ROSTER, "Hi", seeded(3)).bonuses).toBe(1);
  });

  it("keeps what was summoned apart from what is left in hand", () => {
    const run = summonFamiliars(emptyFamiliarSim(ROSTER), 100, 0, ROSTER, "Hi", seeded(5));
    const drawn = Object.values(run.sim.drawn).reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0);
    expect(drawn).toBe(100);
    const combined = combineUp(run.sim, "Hi", GROUP, "same", MAX_COMBINE_STAR);
    // Combining changes what is in hand and never what was summoned.
    expect(combined.drawn).toEqual(run.sim.drawn);
  });

  it("counts the diamonds it was paid for", () => {
    const run = summonFamiliars(emptyFamiliarSim(ROSTER), FAMILIAR_BATCH.summons, FAMILIAR_BATCH.diamonds, ROSTER, "Hi", seeded(5));
    expect(run.sim.diamonds).toBe(FAMILIAR_BATCH.diamonds);
  });

  it("leaves the run it was given alone", () => {
    const sim = emptyFamiliarSim(ROSTER);
    summonFamiliars(sim, 11, 5000, ROSTER, "Hi", seeded(9));
    expect(sim.summons).toBe(0);
    expect(sim.copies.Hi!.every((count) => count === 0)).toBe(true);
  });
});

describe("combining copies in hand", () => {
  const withCopies = (copies: Record<string, [number, number]>) => {
    const sim = emptyFamiliarSim(ROSTER);
    for (const [name, [star, count]] of Object.entries(copies)) sim.copies[name]![star] = count;
    return sim;
  };

  it("takes the familiar itself plus its self fodder", () => {
    const next = combineOnce(withCopies({ Hi: [1, 3] }), "Hi", 1, GROUP, { self: 2, same: 0 })!;
    expect(next.copies.Hi![1]).toBe(0);
    expect(next.copies.Hi![2]).toBe(1);
    expect(next.combines).toBe(1);
  });

  it("takes same type fodder from the rest of the group, in the order given", () => {
    const sim = withCopies({ Hi: [1, 1], Ti: [1, 2], A: [1, 2] });
    const next = combineOnce(sim, "Hi", 1, GROUP, { self: 0, same: 4 })!;
    expect(next.copies.Hi![2]).toBe(1);
    // Ti comes first in the group order, so it is emptied before A is touched.
    expect(next.copies.Ti![1]).toBe(0);
    expect(next.copies.A![1]).toBe(0);
  });

  it("refuses when the fodder isn't there, or the bar wouldn't fill", () => {
    expect(combineOnce(withCopies({ Hi: [1, 2] }), "Hi", 1, GROUP, { self: 2, same: 0 })).toBeNull();
    expect(combineOnce(withCopies({ Hi: [1, 3] }), "Hi", 1, GROUP, { self: 1, same: 0 })).toBeNull();
    expect(combineOnce(withCopies({ Hi: [10, 2] }), "Hi", MAX_COMBINE_STAR, GROUP, { self: 1, same: 0 })).toBeNull();
  });

  it("only ever counts the group as four familiars", () => {
    expect(GROUP).toHaveLength(GROUP_SIZE);
    const sim = withCopies({ Hi: [1, 1], Pe: [1, 4] });
    expect(combineOnce(sim, "Hi", 1, GROUP, { self: 0, same: 4 })).toBeNull();
  });

  it("finds the best copy in hand", () => {
    const sim = withCopies({ Hi: [3, 1], Ti: [0, 2] });
    expect(bestStar(sim, "Hi")).toBe(3);
    expect(bestStar(sim, "Ti")).toBe(0);
    expect(bestStar(sim, "Po")).toBeNull();
  });
});

describe("combining everything in hand", () => {
  const withCopies = (copies: Record<string, [number, number]>) => {
    const sim = emptyFamiliarSim(ROSTER);
    for (const [name, [star, count]] of Object.entries(copies)) sim.copies[name]![star] = count;
    return sim;
  };

  it("takes the goal up as far as its own copies go in self mode", () => {
    const next = combineUp(withCopies({ Hi: [0, 8] }), "Hi", GROUP, "self", 2);
    // A 2★ takes three at 1★, and each of those two at 0★: six spent, two left over.
    expect(next.copies.Hi![0]).toBe(2);
    expect(next.copies.Hi![1]).toBe(0);
    expect(next.copies.Hi![2]).toBe(1);
    expect(next.combines).toBe(4);
  });

  it("leaves the group alone in self mode", () => {
    const next = combineUp(withCopies({ Hi: [0, 2], Ti: [0, 8] }), "Hi", GROUP, "self", MAX_COMBINE_STAR);
    expect(next.copies.Ti![0]).toBe(8);
  });

  it("spends the group in same mode", () => {
    const next = combineUp(withCopies({ Hi: [0, 1], Ti: [0, 2] }), "Hi", GROUP, "same", 1);
    expect(next.copies.Hi![1]).toBe(1);
    expect(next.copies.Ti![0]).toBe(0);
  });

  it("stops at the goal star", () => {
    const next = combineUp(withCopies({ Hi: [0, 400] }), "Hi", GROUP, "self", 2);
    expect(next.copies.Hi![2]).toBe(1);
    // Nothing is ever carried past the star that was asked for.
    expect(next.copies.Hi![3]).toBe(0);
  });

  it("never combines more than the goal could still need", () => {
    // A 1★ goal wants one copy there and no more, so a pile of 0★ is not ground up behind it.
    const next = combineUp(withCopies({ Hi: [0, 200] }), "Hi", GROUP, "self", 1);
    expect(next.copies.Hi![1]).toBe(1);
    expect(next.copies.Hi![0]).toBe(198);
  });

  it("leaves the run it was given alone", () => {
    const sim = withCopies({ Hi: [0, 4] });
    combineUp(sim, "Hi", GROUP, "self", 1);
    expect(sim.copies.Hi![0]).toBe(4);
  });
});

describe("the estimate against a run of the real thing", () => {
  /** What the summon panel does: summon a bundle, combine, repeat. Both gauges pay out as they fill. */
  function panelRun(goal: number, mode: "self" | "same", random: () => number) {
    let sim = emptyFamiliarSim(ROSTER);
    for (let tick = 0; tick < 100_000; tick += 1) {
      sim = summonFamiliars(sim, FAMILIAR_BATCH.summons, FAMILIAR_BATCH.diamonds, ROSTER, "Hi", random).sim;
      sim = combineUp(sim, "Hi", GROUP, mode, goal);
      if ((bestStar(sim, "Hi") ?? -1) >= goal) return sim.summons;
    }
    return sim.summons;
  }

  it("lands within a tenth of what summoning and combining actually take", () => {
    const goal = 8;
    const estimate = estimateFamiliar(0, goal, "self");
    const random = seeded(2024);
    const runs = 40;
    const mean = Array.from({ length: runs }, () => panelRun(goal, "self", random)).reduce((a, b) => a + b, 0) / runs;
    expect(mean).toBeGreaterThan(estimate.summons * 0.9);
    expect(mean).toBeLessThan(estimate.summons * 1.1);
  });
});
