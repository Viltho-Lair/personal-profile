import { describe, expect, it } from "vitest";
import {
  bestStar,
  combineBonusesBy,
  combineOnce,
  combineUp,
  diamondsFor,
  COMBINE_BONUS,
  COMBINE_SLOTS,
  drawFamiliar,
  emptyFamiliarSim,
  estimateFamiliar,
  FAMILIAR_BATCH,
  FAMILIAR_SUMMON_CHANCES,
  FAMILIAR_SUMMON_COSTS,
  fodderBar,
  fodderSets,
  GROUP_SIZE,
  STAR_COST,
  MAX_COMBINE_STAR,
  MAX_SUMMON_STAR,
  pickFodder,
  playFamiliar,
  ROSTER_SIZE,
  seeded,
  sameChance,
  selfChance,
  selfOnlyFodder,
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
      expect(fodderSets(star).every((set) => set.self > 0)).toBe(true);
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

  it("takes 1, 2 or 4 copies of the familiar itself when nothing else helps", () => {
    expect([0, 1, 7, 9].map(selfOnlyFodder)).toEqual([1, 2, 4, 1]);
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

describe("estimating a goal", () => {
  it("asks for nothing when the familiar is already there", () => {
    const estimate = estimateFamiliar(10, 10);
    expect(estimate.summons).toBe(0);
    expect(estimate.diamonds).toBe(0);
    expect(estimate.combines).toBe(0);
  });

  it("stops at 10★, since the 11th star takes an awakening", () => {
    expect(estimateFamiliar(0, 11).to).toBe(MAX_COMBINE_STAR);
    expect(estimateFamiliar(0, 99).to).toBe(MAX_COMBINE_STAR);
  });

  it("costs more the further the goal is", () => {
    let last = -1;
    for (let star = 0; star <= MAX_COMBINE_STAR; star += 1) {
      const estimate = estimateFamiliar(0, star);
      expect(estimate.summons).toBeGreaterThan(last);
      last = estimate.summons;
    }
  });

  it("costs less the further along the familiar already is", () => {
    const scratch = estimateFamiliar(0, MAX_COMBINE_STAR).summons;
    const part = estimateFamiliar(8, MAX_COMBINE_STAR).summons;
    const nearly = estimateFamiliar(9, MAX_COMBINE_STAR).summons;
    expect(part).toBeLessThan(scratch);
    expect(nearly).toBeLessThan(part);
  });

  it("buys its summons in bundles of eleven", () => {
    const estimate = estimateFamiliar(0, 7);
    expect(estimate.batches).toBe(Math.ceil(estimate.summons / FAMILIAR_BATCH.summons));
    expect(estimate.diamonds).toBe(estimate.batches * FAMILIAR_BATCH.diamonds);
  });

  it("counts the bonus bars by the summons and combines they take", () => {
    const estimate = estimateFamiliar(0, MAX_COMBINE_STAR);
    expect(estimate.summonBonuses).toBe(Math.floor(estimate.summons / SUMMON_BONUS.every));
    expect(estimate.combineBonuses).toBe(Math.floor(estimate.combines / COMBINE_BONUS.every));
    expect(estimate.combineBonuses).toBe(combineBonusesBy(estimate.combines));
  });

  it("summons one copy of the goal familiar in twelve", () => {
    const estimate = estimateFamiliar(0, MAX_COMBINE_STAR);
    expect(estimate.copies).toBe(Math.round(estimate.summons / ROSTER_SIZE));
  });

  it("puts the median and the nine-in-ten run either side of the average", () => {
    const estimate = estimateFamiliar(0, 8);
    expect(estimate.runs).toBeGreaterThan(1);
    expect(estimate.median.summons).toBeLessThanOrEqual(estimate.likely.summons);
    expect(estimate.likely.diamonds).toBe(diamondsFor(estimate.likely.summons));
  });

  it("comes out the same every time it's asked", () => {
    expect(estimateFamiliar(0, 9)).toEqual(estimateFamiliar(0, 9));
  });
});

describe("one run of a goal", () => {
  it("stops as soon as the goal star is in hand", () => {
    // 0★ to 1★ takes one more copy of the familiar, or two of its group, so it lands inside a few summons.
    const play = playFamiliar(0, 1, seeded(42));
    expect(play.summons).toBeGreaterThan(0);
    expect(play.combines).toBeGreaterThanOrEqual(0);
  });

  it("asks for nothing when the familiar starts at the goal", () => {
    expect(playFamiliar(5, 5, seeded(1))).toEqual({ summons: 0, combines: 0 });
  });

  it("costs less the further along the familiar starts", () => {
    const scratch = playFamiliar(0, 8, seeded(11)).summons;
    const part = playFamiliar(7, 8, seeded(11)).summons;
    expect(part).toBeLessThan(scratch);
  });
});

describe("picking the fodder", () => {
  it("leans on the group for every slot it can fill", () => {
    expect(pickFodder(1, 10, 10)).toEqual({ self: 0, same: 4 });
    expect(pickFodder(1, 10, 3)).toEqual({ self: 1, same: 2 });
    expect(pickFodder(1, 10, 0)).toEqual({ self: 2, same: 0 });
  });

  it("gives up when the hand can't fill the bar", () => {
    expect(pickFodder(1, 1, 0)).toBeNull();
    expect(pickFodder(1, 2, 1)).toBeNull();
    // 7★ always wants copies of the familiar itself, however much of the group is to hand.
    expect(pickFodder(7, 1, 99)).toBeNull();
    expect(pickFodder(7, 4, 2)).toEqual({ self: 3, same: 2 });
  });
});

describe("summoning", () => {
  it("draws a star by the chances, then one of the familiars", () => {
    expect(drawFamiliar(ROSTER, seeded(1)).star).toBeLessThanOrEqual(MAX_SUMMON_STAR);
    // A roll at the very bottom of the table is 0★, at the very top 8★.
    const low = [0, 0];
    const high = [0.99999, 0];
    expect(drawFamiliar(ROSTER, () => low.shift() ?? 0).star).toBe(0);
    expect(drawFamiliar(ROSTER, () => high.shift() ?? 0).star).toBe(MAX_SUMMON_STAR);
  });

  it("hands over a random familiar at 6★ every 300 summons", () => {
    const run = summonFamiliars(emptyFamiliarSim(ROSTER), SUMMON_BONUS.every * 2, 0, ROSTER, seeded(7));
    expect(run.bonuses).toHaveLength(2);
    expect(run.sim.summons).toBe(SUMMON_BONUS.every * 2);
    const drawn = Object.values(run.drawn).reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0);
    // Every summon plus the two bonuses came out somewhere.
    expect(drawn).toBe(SUMMON_BONUS.every * 2 + 2);
  });

  it("picks the bonus up where the last run left off", () => {
    const first = summonFamiliars(emptyFamiliarSim(ROSTER), SUMMON_BONUS.every - 1, 0, ROSTER, seeded(3));
    expect(first.bonuses).toHaveLength(0);
    expect(summonFamiliars(first.sim, 1, 0, ROSTER, seeded(3)).bonuses).toHaveLength(1);
  });

  it("counts the diamonds it was paid for", () => {
    const run = summonFamiliars(emptyFamiliarSim(ROSTER), FAMILIAR_BATCH.summons, FAMILIAR_BATCH.diamonds, ROSTER, seeded(5));
    expect(run.sim.diamonds).toBe(FAMILIAR_BATCH.diamonds);
    expect(run.sim.summons).toBe(FAMILIAR_BATCH.summons);
  });

  it("leaves the run it was given alone", () => {
    const sim = emptyFamiliarSim(ROSTER);
    summonFamiliars(sim, 11, 5000, ROSTER, seeded(9));
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
    const sim = withCopies({ Hi: [1, 3] });
    const next = combineOnce(sim, "Hi", 1, GROUP, { self: 2, same: 0 });
    expect(next).not.toBeNull();
    expect(next!.copies.Hi![1]).toBe(0);
    expect(next!.copies.Hi![2]).toBe(1);
    expect(next!.combines).toBe(1);
  });

  it("takes same type fodder from the rest of the group", () => {
    const sim = withCopies({ Hi: [1, 1], Ti: [1, 2], A: [1, 2] });
    const next = combineOnce(sim, "Hi", 1, GROUP, { self: 0, same: 4 });
    expect(next!.copies.Hi![2]).toBe(1);
    expect(next!.copies.Ti![1]! + next!.copies.A![1]!).toBe(0);
  });

  it("refuses when the fodder isn't there, or the bar wouldn't fill", () => {
    expect(combineOnce(withCopies({ Hi: [1, 2] }), "Hi", 1, GROUP, { self: 2, same: 0 })).toBeNull();
    expect(combineOnce(withCopies({ Hi: [1, 3] }), "Hi", 1, GROUP, { self: 1, same: 0 })).toBeNull();
    expect(combineOnce(withCopies({ Hi: [10, 2] }), "Hi", MAX_COMBINE_STAR, GROUP, { self: 1, same: 0 })).toBeNull();
  });

  it("only ever counts the group as four familiars", () => {
    expect(GROUP).toHaveLength(GROUP_SIZE);
    // Another group's familiar is no help at all.
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
  it("takes the goal up as far as its own copies go", () => {
    const sim = emptyFamiliarSim(ROSTER);
    sim.copies.Hi![0] = 8;
    const next = combineUp(sim, "Hi", GROUP, 2);
    // Eight at 0★ make four at 1★, and three of those make one at 2★.
    expect(next.copies.Hi![0]).toBe(0);
    expect(next.copies.Hi![1]).toBe(1);
    expect(next.copies.Hi![2]).toBe(1);
    expect(next.combines).toBe(5);
  });

  it("spends the group first, since their copies are worth nothing else", () => {
    const sim = emptyFamiliarSim(ROSTER);
    sim.copies.Hi![0] = 2;
    sim.copies.Ti![0] = 2;
    sim.copies.A![0] = 2;
    const next = combineUp(sim, "Hi", GROUP, 1);
    // Two combines, each one Hi and two of the group, instead of one on Hi's own pair.
    expect(next.copies.Hi![1]).toBe(2);
    expect(next.copies.Ti![0]! + next.copies.A![0]!).toBe(0);
  });

  it("never takes one of the group up a star of its own", () => {
    const sim = emptyFamiliarSim(ROSTER);
    sim.copies.Ti![0] = 8;
    const next = combineUp(sim, "Hi", GROUP, MAX_COMBINE_STAR);
    expect(next.copies.Ti![0]).toBe(8);
    expect(next.combines).toBe(0);
  });

  it("stops at the goal star", () => {
    const sim = emptyFamiliarSim(ROSTER);
    sim.copies.Hi![0] = 8;
    expect(combineUp(sim, "Hi", GROUP, 1).copies.Hi![1]).toBe(4);
  });

  it("leaves the run it was given alone", () => {
    const sim = emptyFamiliarSim(ROSTER);
    sim.copies.Hi![0] = 4;
    combineUp(sim, "Hi", GROUP, 1);
    expect(sim.copies.Hi![0]).toBe(4);
  });
});

describe("the estimate against a run of the real thing", () => {
  /** What the summon panel does: summon a bundle, take the 7★ picks the bar has earned, combine, repeat. */
  function panelRun(goal: number, random: () => number) {
    let sim = emptyFamiliarSim(ROSTER);
    let picks = 0;
    for (let tick = 0; tick < 100_000; tick += 1) {
      sim = summonFamiliars(sim, FAMILIAR_BATCH.summons, FAMILIAR_BATCH.diamonds, ROSTER, random).sim;
      const earned = combineBonusesBy(sim.combines);
      if (earned > picks) {
        const copies = [...sim.copies.Hi!];
        copies[COMBINE_BONUS.star]! += earned - picks;
        sim = { ...sim, copies: { ...sim.copies, Hi: copies } };
        picks = earned;
      }
      sim = combineUp(sim, "Hi", GROUP, goal);
      if ((bestStar(sim, "Hi") ?? -1) >= goal) return sim.summons;
    }
    return sim.summons;
  }

  it("lands within a tenth of what summoning and combining actually take", () => {
    const goal = 7;
    const estimate = estimateFamiliar(0, goal);
    const random = seeded(2024);
    const runs = 60;
    const mean = Array.from({ length: runs }, () => panelRun(goal, random)).reduce((a, b) => a + b, 0) / runs;
    expect(mean).toBeGreaterThan(estimate.summons * 0.9);
    expect(mean).toBeLessThan(estimate.summons * 1.1);
  });
});
