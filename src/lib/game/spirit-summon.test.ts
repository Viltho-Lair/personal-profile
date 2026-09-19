import { describe, expect, it } from "vitest";
import {
  ANCIENT,
  bonusOptions,
  combineAll,
  copyNeed,
  emptySim,
  EPIC,
  estimateSpirits,
  goalsReached,
  gateShort,
  IMMORTAL,
  LEGENDARY,
  MYTHIC,
  rankGate,
  requiredRanks,
  LEGENDARY_PER_SUMMON,
  nextStep,
  rankLabel,
  rankNeed,
  settleMains,
  SPIRIT_BATCH,
  SPIRIT_RANKS,
  SPIRIT_SUMMON_CHANCES,
  summonSpirits,
  switchElement,
  takeBonus,
  upgradeAll,
  upgradeGoal,
  type Roster,
} from "./spirit-summon";

const ROSTER: Roster = [
  { name: "Loar", element: "Earth" },
  { name: "Noah", element: "Earth" },
  { name: "Radon", element: "Earth" },
  { name: "Ark", element: "Water" },
  { name: "Todd", element: "Water" },
  { name: "Luga", element: "Water" },
  { name: "Sala", element: "Fire" },
  { name: "Mum", element: "Fire" },
  { name: "Bo", element: "Fire" },
  { name: "Herh", element: "Wind" },
  { name: "Kart", element: "Wind" },
  { name: "Zappy", element: "Wind" },
];

const ANCIENT_RANK = { grade: ANCIENT, star: 0 };
const OFF = { lowerAsFodder: false };

describe("spirit summon chances", () => {
  it("adds up to 100%", () => {
    expect(SPIRIT_SUMMON_CHANCES.reduce((sum, chance) => sum + chance, 0)).toBeCloseTo(100, 6);
  });

  it("is worth about 1/112 of a Legendary a summon", () => {
    expect(LEGENDARY_PER_SUMMON).toBeCloseTo(2.2795 / 256, 8);
  });
});

describe("the ladder", () => {
  it("takes 256 Commons of the spirit for a Legendary", () => {
    expect(copyNeed(0).spirit * 256).toBeCloseTo(1);
    expect(copyNeed(LEGENDARY)).toEqual({ spirit: 1, element: 0, shards: 0 });
  });

  it("pays stars 1 spirit, 2 element, 1, 2, 1", () => {
    expect(rankNeed({ grade: LEGENDARY, star: 1 })).toEqual({ spirit: 2, element: 0, shards: 0 });
    expect(rankNeed({ grade: LEGENDARY, star: 2 })).toEqual({ spirit: 2, element: 2, shards: 0 });
    expect(rankNeed({ grade: LEGENDARY, star: 5 })).toEqual({ spirit: 4, element: 4, shards: 0 });
  });

  it("adds 3 Legendaries of the element at A5 for Mythic and Immortal", () => {
    expect(copyNeed(MYTHIC)).toEqual({ spirit: 4, element: 7, shards: 0 });
    expect(rankNeed({ grade: MYTHIC, star: 2 })).toEqual({ spirit: 5, element: 9, shards: 0 });
    expect(copyNeed(IMMORTAL)).toEqual({ spirit: 7, element: 14, shards: 0 });
  });

  it("takes one more Legendary of itself and 1,000 light shards for Ancient", () => {
    expect(copyNeed(ANCIENT)).toEqual({ spirit: 11, element: 18, shards: 1000 });
  });

  it("names ranks the way the game does", () => {
    expect(rankLabel({ grade: LEGENDARY, star: 3 })).toBe("Legendary A3");
    expect(rankLabel(ANCIENT_RANK)).toBe("Ancient");
    expect(SPIRIT_RANKS).toHaveLength(4 + 18 + 1);
  });

  it("says what the next step takes", () => {
    expect(nextStep({ grade: 0, star: 0 })).toMatchObject({ spirit: 3, element: 0, fodder: 0 });
    expect(nextStep({ grade: IMMORTAL, star: 2 })).toMatchObject({ spirit: 1, fodder: LEGENDARY });
    expect(nextStep({ grade: MYTHIC, star: 5 })).toMatchObject({ element: 3, fodder: LEGENDARY });
    expect(nextStep({ grade: LEGENDARY, star: 1 })).toMatchObject({ spirit: 0, element: 2 });
    expect(nextStep({ grade: LEGENDARY, star: 5 })).toMatchObject({ element: 3, rank: { grade: LEGENDARY + 1, star: 0 } });
    expect(nextStep({ grade: IMMORTAL, star: 5 })).toMatchObject({ spirit: 1, shards: 1000, rank: ANCIENT_RANK });
    expect(nextStep(ANCIENT_RANK)).toBeNull();
  });
});

describe("the gates", () => {
  it("waits for all twelve at Mythic before a Mythic star, and at Immortal before an Immortal one", () => {
    expect(rankGate({ grade: MYTHIC, star: 0 })).toBeNull();
    expect(rankGate({ grade: LEGENDARY, star: 5 })).toBeNull();
    expect(rankGate({ grade: MYTHIC, star: 1 })).toBe(MYTHIC);
    expect(rankGate({ grade: IMMORTAL, star: 0 })).toBe(MYTHIC);
    expect(rankGate({ grade: IMMORTAL, star: 1 })).toBe(IMMORTAL);
    expect(rankGate(ANCIENT_RANK)).toBe(IMMORTAL);
  });

  it("asks every spirit for the gate's grade, the goal for its own rank", () => {
    const wanted = requiredRanks([{ name: "Loar", rank: ANCIENT_RANK }], ROSTER);
    expect(wanted).toHaveLength(12);
    expect(wanted[0]).toMatchObject({ name: "Loar", rank: ANCIENT_RANK, gate: false });
    expect(wanted.slice(1).every((entry) => entry.gate && entry.rank.grade === IMMORTAL)).toBe(true);
    // A goal no gate stands in the way of asks nothing of the others.
    expect(requiredRanks([{ name: "Loar", rank: { grade: MYTHIC, star: 0 } }], ROSTER)).toHaveLength(1);
  });

  it("counts who is still short of a gate", () => {
    const sim = emptySim(ROSTER);
    sim.mains.Loar = { grade: MYTHIC, star: 0 };
    expect(gateShort(sim, MYTHIC, ROSTER)).toHaveLength(11);
    expect(gateShort(sim, MYTHIC, ROSTER)).not.toContain("Loar");
  });
});

describe("estimateSpirits", () => {
  it("counts the whole roster the gates ask for", () => {
    const estimate = estimateSpirits([{ name: "Loar", rank: ANCIENT_RANK }], ROSTER);
    expect(estimate.gate).toBe(IMMORTAL);
    expect(estimate.needs).toHaveLength(12);
    expect(estimate.limit).toBe("Earth");
    expect(estimate.shards).toBe(1000);
    expect(estimate.diamonds).toBe(estimate.batches * SPIRIT_BATCH.diamonds);
    // Earth carries Loar's 29 Legendaries and 21 each for Noah and Radon, at a quarter of the summons.
    const bare = (29 + 21 + 21) / (LEGENDARY_PER_SUMMON / 4);
    expect(estimate.summons).toBeLessThan(bare);
    expect(estimate.summons).toBeGreaterThan(bare * 0.8);
  });

  it("costs far less for a goal below the first gate", () => {
    const mythic = estimateSpirits([{ name: "Loar", rank: { grade: MYTHIC, star: 0 } }], ROSTER);
    const ancient = estimateSpirits([{ name: "Loar", rank: ANCIENT_RANK }], ROSTER);
    expect(mythic.gate).toBeNull();
    expect(mythic.summons * 5).toBeLessThan(ancient.summons);
  });

  it("costs a little more for a second spirit of an element, the roster being most of it", () => {
    const one = estimateSpirits([{ name: "Loar", rank: ANCIENT_RANK }], ROSTER);
    const two = estimateSpirits(
      [
        { name: "Loar", rank: ANCIENT_RANK },
        { name: "Noah", rank: ANCIENT_RANK },
      ],
      ROSTER,
    );
    expect(two.summons).toBeGreaterThan(one.summons);
    expect(two.summons).toBeLessThan(one.summons * 1.3);
  });

  it("is nothing without goals", () => {
    expect(estimateSpirits([], ROSTER)).toMatchObject({ summons: 0, diamonds: 0, limit: null });
  });
});

describe("summonSpirits", () => {
  it("draws grade then spirit and offers a bonus every 300th summon", () => {
    const run = summonSpirits(emptySim(ROSTER), 11, 295, ROSTER, () => 0);
    expect(run.sim.inventory.Loar![0]).toBe(11);
    expect(run.bonuses).toHaveLength(1);
    expect(new Set(run.bonuses[0]).size).toBe(2);
  });

  it("gives an Epic for the bonus", () => {
    expect(takeBonus(emptySim(ROSTER), "Noah").inventory.Noah![EPIC]).toBe(1);
    expect(bonusOptions(ROSTER, () => 0.99)).toEqual(["Zappy", "Kart"]);
  });
});

describe("combining and upgrading", () => {
  const withSpares = (spares: Record<string, Partial<Record<number, number>>>) => {
    const sim = emptySim(ROSTER);
    for (const [name, grades] of Object.entries(spares)) {
      for (const [grade, count] of Object.entries(grades)) sim.inventory[name]![Number(grade)] = count ?? 0;
    }
    return sim;
  };

  it("combines four to one up to Legendary", () => {
    const sim = combineAll(withSpares({ Ark: { 0: 9 } }));
    expect(sim.inventory.Ark!.slice(0, 2)).toEqual([1, 2]);
  });

  it("makes the best copy each spirit's own", () => {
    const sim = settleMains(withSpares({ Loar: { 0: 3, 2: 1 }, Noah: { 1: 1 } }), ROSTER);
    expect(sim.mains.Loar).toEqual({ grade: 2, star: 0 });
    expect(sim.inventory.Loar![2]).toBe(0);
    expect(sim.mains.Noah).toEqual({ grade: 1, star: 0 });
    expect(sim.mains.Radon).toBeUndefined();
  });

  it("combines Commons into the goal below Legendary", () => {
    const goals = [{ name: "Loar", rank: ANCIENT_RANK }];
    const step = upgradeGoal(withSpares({ Loar: { 0: 4 } }), goals, 0, ROSTER, OFF);
    expect(step?.to).toEqual({ grade: 1, star: 0 });
  });

  it("uses other spirits of the element for element stars, never higher goals", () => {
    const goals = [
      { name: "Noah", rank: ANCIENT_RANK },
      { name: "Loar", rank: ANCIENT_RANK },
    ];
    const sim = settleMains(withSpares({ Loar: { [LEGENDARY]: 2 }, Noah: { [LEGENDARY]: 2 } }), ROSTER);
    // Loar A1 needs 2 of Earth: Radon has none, Loar's own spare is used up by A0 -> A1, and Noah is above it.
    const first = upgradeGoal(sim, goals, 1, ROSTER, OFF);
    expect(first?.to).toEqual({ grade: LEGENDARY, star: 1 });
    expect(upgradeGoal(first!.sim, goals, 1, ROSTER, OFF)).toBeNull();
  });

  it("lets a lower goal feed a higher one only when allowed, and says so", () => {
    const goals = [
      { name: "Loar", rank: ANCIENT_RANK },
      { name: "Noah", rank: ANCIENT_RANK },
    ];
    const sim = settleMains(withSpares({ Loar: { [LEGENDARY]: 1 }, Noah: { [LEGENDARY]: 3 } }), ROSTER);
    const star = { ...sim, mains: { ...sim.mains, Loar: { grade: LEGENDARY, star: 1 } } };
    star.inventory = { ...star.inventory, Loar: [...star.inventory.Loar!] };
    star.inventory.Loar![LEGENDARY] = 0;
    expect(upgradeGoal(star, goals, 0, ROSTER, OFF)).toBeNull();
    const step = upgradeGoal(star, goals, 0, ROSTER, { lowerAsFodder: true });
    expect(step?.to).toEqual({ grade: LEGENDARY, star: 2 });
    expect(step?.used).toEqual(["Noah"]);
  });

  it("holds a Mythic star until all twelve are Mythic", () => {
    const goals = [{ name: "Loar", rank: ANCIENT_RANK }];
    const sim = settleMains(withSpares({ Loar: { [LEGENDARY]: 4 }, Radon: { [LEGENDARY]: 4 } }), ROSTER);
    sim.mains.Loar = { grade: MYTHIC, star: 0 };
    // Loar is Mythic with fodder to spare, but the other eleven aren't there yet.
    expect(upgradeGoal(sim, goals, 0, ROSTER, OFF)).toBeNull();
    const all = { ...sim, mains: { ...sim.mains } };
    for (const spirit of ROSTER) all.mains[spirit.name] = { grade: MYTHIC, star: 0 };
    expect(upgradeGoal(all, goals, 0, ROSTER, OFF)?.to).toEqual({ grade: MYTHIC, star: 1 });
  });

  it("holds an Immortal star until all twelve are Immortal", () => {
    const goals = [{ name: "Loar", rank: ANCIENT_RANK }];
    const sim = settleMains(withSpares({ Loar: { [LEGENDARY]: 4 }, Radon: { [LEGENDARY]: 4 } }), ROSTER);
    for (const spirit of ROSTER) sim.mains[spirit.name] = { grade: MYTHIC, star: 5 };
    sim.mains.Loar = { grade: IMMORTAL, star: 0 };
    expect(upgradeGoal(sim, goals, 0, ROSTER, OFF)).toBeNull();
    const all = { ...sim, mains: { ...sim.mains } };
    for (const spirit of ROSTER) all.mains[spirit.name] = { grade: IMMORTAL, star: 0 };
    expect(upgradeGoal(all, goals, 0, ROSTER, OFF)?.to).toEqual({ grade: IMMORTAL, star: 1 });
  });

  it("raises the other eleven to the gate on the way to the goal", () => {
    const goals = [{ name: "Loar", rank: { grade: MYTHIC, star: 1 } }];
    // Mythic A0 costs each spirit 4 of its own and 7 of its element: 15 each covers an element's three.
    const spares = Object.fromEntries(ROSTER.map((spirit) => [spirit.name, { [LEGENDARY]: 15 }]));
    const done = upgradeAll(withSpares(spares), goals, ROSTER, OFF);
    expect(done.sim.mains.Loar).toEqual({ grade: MYTHIC, star: 1 });
    expect(ROSTER.every((spirit) => (done.sim.mains[spirit.name]?.grade ?? 0) >= MYTHIC)).toBe(true);
  });

  it("combines Epics into the Legendary a star needs", () => {
    const goals = [{ name: "Loar", rank: ANCIENT_RANK }];
    const sim = settleMains(withSpares({ Loar: { [LEGENDARY]: 1, [EPIC]: 4 } }), ROSTER);
    const step = upgradeGoal(sim, goals, 0, ROSTER, OFF);
    expect(step?.to).toEqual({ grade: LEGENDARY, star: 1 });
    expect(step?.sim.inventory.Loar![EPIC]).toBe(0);
  });

  it("needs the light shards for Ancient", () => {
    const goals = [{ name: "Loar", rank: ANCIENT_RANK }];
    const sim = settleMains(withSpares({ Loar: { [LEGENDARY]: 2 } }), ROSTER);
    for (const spirit of ROSTER) sim.mains[spirit.name] = { grade: IMMORTAL, star: 0 };
    sim.mains.Loar = { grade: IMMORTAL, star: 5 };
    expect(upgradeGoal(sim, goals, 0, ROSTER, OFF)).toBeNull();
    const done = upgradeAll({ ...sim, shards: 1000 }, goals, ROSTER, OFF);
    expect(done.sim.mains.Loar).toEqual(ANCIENT_RANK);
    expect(done.sim.shards).toBe(0);
    expect(goalsReached(done.sim, goals)).toBe(true);
  });

  it("reaches Ancient once the whole roster is through both gates", () => {
    const goals = [{ name: "Loar", rank: ANCIENT_RANK }];
    // 11 of its own and 18 of its element for Loar, 7 and 14 for each of the other eleven, with room to spare.
    const spares = Object.fromEntries(ROSTER.map((spirit) => [spirit.name, { [LEGENDARY]: 40 }]));
    const done = upgradeAll({ ...withSpares(spares), shards: 1000 }, goals, ROSTER, OFF);
    expect(done.sim.mains.Loar).toEqual(ANCIENT_RANK);
    expect(goalsReached(done.sim, goals)).toBe(true);
    const short = Object.fromEntries(ROSTER.map((spirit) => [spirit.name, { [LEGENDARY]: 6 }]));
    const stuck = upgradeAll({ ...withSpares(short), shards: 1000 }, goals, ROSTER, OFF);
    expect(stuck.sim.mains.Loar).not.toEqual(ANCIENT_RANK);
  });
});

describe("switchElement", () => {
  it("takes two Epics for a chosen element and one for a random one", () => {
    const sim = emptySim(ROSTER);
    sim.inventory.Ark![EPIC] = 2;
    const chosen = switchElement(sim, "Ark", "Earth", ROSTER, () => 0);
    expect(chosen?.got).toBe("Loar");
    expect(chosen?.sim.inventory.Ark![EPIC]).toBe(0);
    const random = switchElement(sim, "Ark", "random", ROSTER, () => 0);
    expect(random?.sim.inventory.Ark![EPIC]).toBe(1);
    expect(switchElement(chosen!.sim, "Ark", "random", ROSTER)).toBeNull();
  });
});
