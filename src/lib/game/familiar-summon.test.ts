import { describe, expect, it } from "vitest";
import {
  ALL_SAME,
  bestMix,
  bestStar,
  combineOdds,
  combineOnce,
  combineGoals,
  COMBINE_BONUS,
  COMBINE_GAUGE,
  COMBINE_SLOTS,
  COMBINE_TARGETS,
  compareFills,
  copiesNeeded,
  diamondsFor,
  drawFamiliar,
  emptyFamiliarSim,
  estimateFamiliars,
  FAMILIAR_BATCH,
  FAMILIAR_SUMMON_CHANCES,
  FAMILIAR_SUMMON_COSTS,
  fodderAt,
  fodderBar,
  fodderFor,
  fodderSets,
  planFor,
  FULL_BAR,
  gaugeFor,
  GROUP_SIZE,
  MAX_COMBINE_STAR,
  MAX_SUMMON_STAR,
  playFamiliars,
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
const SPARES = { attribute: ["Ti", "A", "Je"] };
/** One goal for Hi, the way the old two-star calls read. */
const one = (from: number, to: number, name = "Hi") => [{ name, group: "attribute", from, to }];
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
    const estimate = estimateFamiliars(one(10, 10), "self");
    expect(estimate.summons).toBe(0);
    expect(estimate.diamonds).toBe(0);
    expect(estimate.combines).toBe(0);
  });

  it("stops at 10★, since the 11th star takes an awakening", () => {
    expect(estimateFamiliars(one(0, 11), "self").goals[0]!.to).toBe(MAX_COMBINE_STAR);
    expect(estimateFamiliars(one(0, 99), "self").goals[0]!.to).toBe(MAX_COMBINE_STAR);
  });

  it("costs more the further the goal is", () => {
    for (const mode of ["self", "same"] as const) {
      let last = -1;
      for (let star = 0; star <= MAX_COMBINE_STAR; star += 1) {
        const estimate = estimateFamiliars(one(0, star), mode);
        expect(estimate.summons).toBeGreaterThan(last);
        last = estimate.summons;
      }
    }
  });

  it("costs less the further along the familiar already is", () => {
    const scratch = estimateFamiliars(one(0, MAX_COMBINE_STAR), "self").summons;
    const nearly = estimateFamiliars(one(9, MAX_COMBINE_STAR), "self").summons;
    expect(nearly).toBeLessThan(scratch);
  });

  it("reaches 6★ on the summon gauge alone, inside its 300 summons", () => {
    // Every 300 summons hands over a 6★ of the familiar you pick, so nothing up to 6★ can cost more than that.
    for (let star = 1; star <= SUMMON_BONUS.star; star += 1) {
      expect(estimateFamiliars(one(0, star), "self").summons).toBeLessThanOrEqual(SUMMON_BONUS.full);
    }
  });

  it("makes same type dearer than self type once the group has to be raised too", () => {
    const self = estimateFamiliars(one(0, MAX_COMBINE_STAR), "self");
    const same = estimateFamiliars(one(0, MAX_COMBINE_STAR), "same");
    expect(same.summons).toBeGreaterThan(self.summons);
  });

  it("buys its summons in bundles of eleven", () => {
    const estimate = estimateFamiliars(one(0, 8), "self");
    expect(estimate.batches).toBe(Math.ceil(estimate.summons / FAMILIAR_BATCH.summons));
    expect(estimate.diamonds).toBe(estimate.batches * FAMILIAR_BATCH.diamonds);
  });

  it("gets a 6★ for every 300 summons it makes", () => {
    const estimate = estimateFamiliars(one(0, MAX_COMBINE_STAR), "self");
    expect(estimate.summonPicks).toBe(Math.floor(estimate.summons / SUMMON_BONUS.full));
    expect(estimate.combinePicks).toBeGreaterThan(0);
  });

  it("summons one copy of the goal familiar in twelve", () => {
    const estimate = estimateFamiliars(one(0, MAX_COMBINE_STAR), "self");
    expect(estimate.copies).toBe(Math.round(estimate.summons / ROSTER_SIZE));
  });

  it("puts the median and the nine-in-ten run either side of the average", () => {
    const estimate = estimateFamiliars(one(0, 9), "self");
    expect(estimate.runs).toBeGreaterThan(1);
    expect(estimate.median.summons).toBeLessThanOrEqual(estimate.likely.summons);
    expect(estimate.likely.diamonds).toBe(diamondsFor(estimate.likely.summons));
  });

  it("finishes every goal inside the summons a run is allowed", () => {
    for (const mode of ["self", "same"] as const) {
      expect(estimateFamiliars(one(0, MAX_COMBINE_STAR), mode).beyond).toBe(false);
    }
  });

  it("comes out the same every time it's asked", () => {
    expect(estimateFamiliars(one(0, 9), "same")).toEqual(estimateFamiliars(one(0, 9), "same"));
  });
});

describe("one run of a goal", () => {
  it("asks for nothing when the familiar starts at the goal", () => {
    expect(playFamiliars(one(5, 5), "self", FULL_BAR, ALL_SAME, seeded(1))).toEqual({
      summons: 0,
      combines: 0,
      picks: { summon: 0, combine: 0 },
      finished: [0],
    });
  });

  it("costs less the further along the familiar starts", () => {
    const scratch = playFamiliars(one(0, 9), "self", FULL_BAR, ALL_SAME, seeded(11)).summons;
    const part = playFamiliars(one(8, 9), "self", FULL_BAR, ALL_SAME, seeded(11)).summons;
    expect(part).toBeLessThan(scratch);
  });

  it("waits for the gauge rather than combining for a goal it hands over whole", () => {
    const play = playFamiliars(one(0, SUMMON_BONUS.star), "self", FULL_BAR, ALL_SAME, seeded(3));
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
    const combined = combineGoals(run.sim, one(0, MAX_COMBINE_STAR), SPARES, "same");
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

  it("refuses when the fodder isn't there, or there is nowhere left to go", () => {
    expect(combineOnce(withCopies({ Hi: [1, 2] }), "Hi", 1, GROUP, { self: 2, same: 0 })).toBeNull();
    expect(combineOnce(withCopies({ Hi: [10, 2] }), "Hi", MAX_COMBINE_STAR, GROUP, { self: 1, same: 0 })).toBeNull();
  });

  it("allows a half-filled bar and lets the roll decide it", () => {
    // One copy at 1★ is a 50% bar rather than a refusal.
    const sim = withCopies({ Hi: [1, 2] });
    expect(combineOnce(sim, "Hi", 1, GROUP, { self: 1, same: 0 }, "Hi", () => 0.1)!.copies.Hi![2]).toBe(1);
    expect(combineOnce(sim, "Hi", 1, GROUP, { self: 1, same: 0 }, "Hi", () => 0.9)!.copies.Hi![2]).toBe(0);
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
    const next = combineGoals(withCopies({ Hi: [0, 8] }), one(0, 2), SPARES, "self");
    // A 2★ takes three at 1★, and each of those two at 0★: six spent, two left over.
    expect(next.copies.Hi![0]).toBe(2);
    expect(next.copies.Hi![1]).toBe(0);
    expect(next.copies.Hi![2]).toBe(1);
    expect(next.combines).toBe(4);
  });

  it("leaves the group alone in self mode", () => {
    const next = combineGoals(withCopies({ Hi: [0, 2], Ti: [0, 8] }), one(0, MAX_COMBINE_STAR), SPARES, "self");
    expect(next.copies.Ti![0]).toBe(8);
  });

  it("spends the group in same mode", () => {
    const next = combineGoals(withCopies({ Hi: [0, 1], Ti: [0, 2] }), one(0, 1), SPARES, "same");
    expect(next.copies.Hi![1]).toBe(1);
    expect(next.copies.Ti![0]).toBe(0);
  });

  it("stops at the goal star", () => {
    const next = combineGoals(withCopies({ Hi: [0, 400] }), one(0, 2), SPARES, "self");
    expect(next.copies.Hi![2]).toBe(1);
    // Nothing is ever carried past the star that was asked for.
    expect(next.copies.Hi![3]).toBe(0);
  });

  it("never combines more than the goal could still need", () => {
    // A 1★ goal wants one copy there and no more, so a pile of 0★ is not ground up behind it.
    const next = combineGoals(withCopies({ Hi: [0, 200] }), one(0, 1), SPARES, "self");
    expect(next.copies.Hi![1]).toBe(1);
    expect(next.copies.Hi![0]).toBe(198);
  });

  it("leaves the run it was given alone", () => {
    const sim = withCopies({ Hi: [0, 4] });
    combineGoals(sim, one(0, 1), SPARES, "self");
    expect(sim.copies.Hi![0]).toBe(4);
  });
});

describe("the estimate against a run of the real thing", () => {
  /** What the summon panel does: summon a bundle, combine, repeat. Both gauges pay out as they fill. */
  function panelRun(goal: number, mode: "self" | "same", random: () => number) {
    let sim = emptyFamiliarSim(ROSTER);
    for (let tick = 0; tick < 100_000; tick += 1) {
      sim = summonFamiliars(sim, FAMILIAR_BATCH.summons, FAMILIAR_BATCH.diamonds, ROSTER, "Hi", random).sim;
      sim = combineGoals(sim, one(0, goal), SPARES, mode);
      if ((bestStar(sim, "Hi") ?? -1) >= goal) return sim.summons;
    }
    return sim.summons;
  }

  it("lands within a tenth of what summoning and combining actually take", () => {
    const goal = 8;
    const estimate = estimateFamiliars(one(0, goal), "self");
    const random = seeded(2024);
    const runs = 40;
    const mean = Array.from({ length: runs }, () => panelRun(goal, "self", random)).reduce((a, b) => a + b, 0) / runs;
    expect(mean).toBeGreaterThan(estimate.summons * 0.9);
    expect(mean).toBeLessThan(estimate.summons * 1.1);
  });
});

describe("how far to fill the bar", () => {
  it("takes the fewest materials that reach the target", () => {
    expect(fodderAt(7, "self", 100)).toEqual({ self: 4, same: 0 });
    expect(fodderAt(7, "self", 50)).toEqual({ self: 2, same: 0 });
    expect(fodderAt(7, "self", 25)).toEqual({ self: 1, same: 0 });
    expect(fodderAt(7, "same", 25)).toEqual({ self: 0, same: 2 });
    expect(fodderAt(7, "same", 12.5)).toEqual({ self: 0, same: 1 });
  });

  it("can't set a step lower than one material already fills", () => {
    // 0★ and 9★ are 100% from a single copy of the familiar itself.
    for (const star of [0, 9]) {
      expect(fodderAt(star, "self", 12.5)).toEqual({ self: 1, same: 0 });
      expect(combineOdds(star, "self", 12.5).bar).toBe(100);
    }
  });

  it("always spends the same materials on a star, whatever the fill", () => {
    // Half the chance is twice the attempts on half the materials, so the total never moves.
    for (let star = 0; star < MAX_COMBINE_STAR; star += 1) {
      for (const target of COMBINE_TARGETS) {
        const odds = combineOdds(star, "self", target);
        expect(odds.materials.self).toBeCloseTo(FULL_BAR / selfChance(star), 6);
        expect(odds.materials.same).toBe(0);
        // Same type, where the slots let it stay pure, costs twice as many for being worth half each.
        const kin = combineOdds(star, "same", target);
        if (kin.fodder.self === 0) expect(kin.materials.same).toBeCloseTo(FULL_BAR / sameChance(star), 6);
      }
    }
  });

  it("earns more gauge the lower the bar is set, since a failure pays out too", () => {
    const full = combineOdds(7, "self", FULL_BAR);
    const quarter = combineOdds(7, "self", 25);
    expect(full.gauge).toBe(516);
    // Four attempts: one that goes through, and three that pay the failure rate.
    expect(quarter.gauge).toBe(516 + 48 * 3);
    expect(quarter.materials.self).toBe(full.materials.self);
    expect(quarter.attempts).toBe(4);
  });

  it("earns nothing extra below 7★, where no combine moves the gauge", () => {
    for (let star = 0; star < 7; star += 1) {
      for (const target of COMBINE_TARGETS) expect(combineOdds(star, "self", target).gauge).toBe(0);
    }
  });
});

describe("which fill is cheapest", () => {
  it("prices every distinct fill once", () => {
    const comparison = compareFills(one(0, MAX_COMBINE_STAR), "self");
    expect(comparison.fills.length).toBeGreaterThan(1);
    // 25% and 12.5% settle on the same materials at every star on self type, so only one of them is run.
    const shapes = comparison.fills.map((fill) => planFor(MAX_COMBINE_STAR, "self", fill.target).map((s) => `${s.self}/${s.same}`).join(","));
    expect(new Set(shapes).size).toBe(shapes.length);
  });

  it("says the fill only matters where the gauge is moving", () => {
    expect(compareFills(one(0, MAX_COMBINE_STAR), "self").matters).toEqual([7, 8]);
    // A goal that never reaches 7★ has nothing to decide.
    expect(compareFills(one(0, 6), "self").matters).toEqual([]);
  });

  it("finds a low fill cheapest on self type, which is what the gauge pays for", () => {
    const comparison = compareFills(one(0, MAX_COMBINE_STAR), "self");
    expect(comparison.best.target).toBeLessThan(FULL_BAR);
    expect(comparison.best.summons).toBeLessThan(comparison.full.summons);
    expect(comparison.best.combinePicks).toBeGreaterThan(comparison.full.combinePicks);
    expect(comparison.saved).toBeGreaterThan(0);
  });

  it("leaves a goal below 7★ all but unchanged however the bar is filled", () => {
    // Nothing under 7★ moves the gauge, so the fill only shuffles how the same materials are spent.
    const comparison = compareFills(one(0, 6), "self");
    for (const fill of comparison.fills) {
      expect(fill.summons).toBeGreaterThan(comparison.full.summons * 0.9);
      expect(fill.summons).toBeLessThan(comparison.full.summons * 1.1);
    }
  });
});

describe("a combine that misses", () => {
  it("loses its materials and leaves the familiar where it was", () => {
    const sim = emptyFamiliarSim(ROSTER);
    sim.copies.Hi![7] = 2;
    // One material at 7★ is a 25% bar, and this roll misses it.
    const next = combineOnce(sim, "Hi", 7, GROUP, { self: 1, same: 0 }, "Hi", () => 0.99)!;
    expect(next.copies.Hi![7]).toBe(1);
    expect(next.copies.Hi![8]).toBe(0);
    expect(next.gauge).toBe(gaugeFor(7).fail);
    expect(next.combines).toBe(1);
  });

  it("takes the familiar up and pays the better rate when it lands", () => {
    const sim = emptyFamiliarSim(ROSTER);
    sim.copies.Hi![7] = 2;
    const next = combineOnce(sim, "Hi", 7, GROUP, { self: 1, same: 0 }, "Hi", () => 0.1)!;
    expect(next.copies.Hi![8]).toBe(1);
    expect(next.gauge).toBe(gaugeFor(7).success - COMBINE_BONUS.full);
    // 516 is over a full gauge, and the 7★ it gives back lands on the very star it was spent from.
    expect(next.picks.combine).toBe(1);
    expect(next.copies.Hi![7]).toBe(1);
  });
});

describe("a list of goals in priority order", () => {
  const goal = (name: string, group: string, to: number) => ({ name, group, from: 0, to });

  it("costs more the more familiars are on it", () => {
    const one = estimateFamiliars([goal("Hi", "attribute", 8)], "self");
    const two = estimateFamiliars([goal("Hi", "attribute", 8), goal("Ti", "attribute", 8)], "self");
    expect(two.summons).toBeGreaterThan(one.summons);
    // Summons rain on every familiar at once, so a second goal is dearer than nothing and cheaper than a rerun.
    expect(two.summons).toBeLessThan(one.summons * 2);
  });

  it("finishes them in the order they are given", () => {
    const estimate = estimateFamiliars(
      [goal("Hi", "attribute", 8), goal("Ti", "attribute", 8), goal("A", "attribute", 8)],
      "self",
    );
    expect(estimate.finished[0]).toBeLessThanOrEqual(estimate.finished[1]!);
    expect(estimate.finished[1]).toBeLessThanOrEqual(estimate.finished[2]!);
    expect(estimate.finished[2]).toBeLessThanOrEqual(estimate.summons);
  });

  it("keeps goals in different groups from sharing fodder", () => {
    const together = estimateFamiliars([goal("Hi", "attribute", 8), goal("Na", "weapon", 8)], "same");
    const inOne = estimateFamiliars([goal("Hi", "attribute", 8), goal("Ti", "attribute", 8)], "same");
    // Two groups keep four spares each; two goals in one group leave only two to feed them both.
    expect(together.summons).toBeLessThan(inOne.summons);
  });

  it("puts the goals it priced in the estimate, tidied up", () => {
    const estimate = estimateFamiliars([{ name: "Hi", group: "attribute", from: 9, to: 4 }], "self");
    // A goal that asks to go backwards is left where it is rather than run.
    expect(estimate.goals[0]).toEqual({ name: "Hi", group: "attribute", from: 9, to: 9 });
    expect(estimate.summons).toBe(0);
  });

  it("raises every goal on the list when it runs", () => {
    const goals = [goal("Hi", "attribute", 7), goal("Ti", "attribute", 7)];
    let sim = emptyFamiliarSim(ROSTER);
    const random = seeded(31);
    for (let tick = 0; tick < 20_000; tick += 1) {
      const needy = goals.find((entry) => (bestStar(sim, entry.name) ?? -1) < entry.to) ?? goals[0]!;
      sim = summonFamiliars(sim, FAMILIAR_BATCH.summons, 0, ROSTER, needy.name, random).sim;
      sim = combineGoals(sim, goals, { attribute: ["A", "Je"] }, "self", FULL_BAR, ALL_SAME, random);
      if (goals.every((entry) => (bestStar(sim, entry.name) ?? -1) >= entry.to)) break;
    }
    for (const entry of goals) expect(bestStar(sim, entry.name)).toBeGreaterThanOrEqual(entry.to);
    // Self type never touches the spares, so what is in hand for them is exactly what was summoned.
    expect(sim.copies.A).toEqual(sim.drawn.A);
    expect(sim.copies.Je).toEqual(sim.drawn.Je);
  });
});

describe("mixing the two kinds of fodder", () => {
  it("takes the group's slots below the crossover and the familiar's own above it", () => {
    // Six is where this one swaps over: the group fills the slots under it, its own copies from it up.
    expect(fodderAt(3, "mix", FULL_BAR, 6)).toEqual(fodderAt(3, "same", FULL_BAR));
    expect(fodderAt(6, "mix", FULL_BAR, 6)).toEqual(fodderAt(6, "self", FULL_BAR));
    expect(fodderAt(9, "mix", FULL_BAR, 6)).toEqual(fodderAt(9, "self", FULL_BAR));
  });

  it("is the two pure ways at either end of the crossover", () => {
    for (let star = 0; star < MAX_COMBINE_STAR; star += 1) {
      expect(fodderAt(star, "mix", FULL_BAR, 0)).toEqual(fodderAt(star, "self", FULL_BAR));
      expect(fodderAt(star, "mix", FULL_BAR, ALL_SAME)).toEqual(fodderAt(star, "same", FULL_BAR));
    }
  });

  it("prices every crossover, the two pure ways among them", () => {
    const mix = bestMix(one(0, 8), FULL_BAR);
    expect(mix.tried).toHaveLength(MAX_COMBINE_STAR + 1);
    expect(mix.pureSelf.crossover).toBe(0);
    expect(mix.pureSame.crossover).toBe(ALL_SAME);
    expect(mix.tried.map((run) => run.crossover)).toEqual(Array.from({ length: MAX_COMBINE_STAR + 1 }, (_, i) => i));
  });

  it("never comes back with worse than the better of the two pure ways", () => {
    const mix = bestMix(one(0, 8), FULL_BAR);
    expect(mix.best.summons).toBeLessThanOrEqual(mix.pureSelf.summons);
    expect(mix.best.summons).toBeLessThanOrEqual(mix.pureSame.summons);
    expect(mix.tied).toContain(mix.crossover);
  });

  it("stops leaning on the group well before the stars the gauges pay out at", () => {
    // Above 7★ a group copy costs what the goal's own costs to raise and no gauge helps it, so it is never worth it.
    const mix = bestMix(one(0, MAX_COMBINE_STAR), FULL_BAR);
    expect(mix.crossover).toBeLessThanOrEqual(COMBINE_BONUS.star);
    const late = mix.tried.find((run) => run.crossover === MAX_COMBINE_STAR)!;
    expect(late.summons).toBeGreaterThan(mix.best.summons * 2);
  });

  it("keeps the crossover it settled on in the estimate it hands back", () => {
    const mix = bestMix(one(0, 8), FULL_BAR);
    expect(mix.best.mode).toBe("mix");
    expect(mix.best.crossover).toBe(mix.crossover);
    expect(mix.best.odds[3]).toEqual(combineOdds(3, "mix", FULL_BAR, mix.crossover));
  });
});
