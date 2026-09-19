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
  IMMORTAL,
  LEGENDARY,
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

  it("adds 3 Legendaries of the element at A5 for Mythic", () => {
    expect(copyNeed(LEGENDARY + 1)).toEqual({ spirit: 4, element: 7, shards: 0 });
  });

  it("pays Mythic stars in Mythics: A1 is one Mythic of itself, A2 two Mythics of its element", () => {
    expect(rankNeed({ grade: LEGENDARY + 1, star: 1 })).toEqual({ spirit: 8, element: 14, shards: 0 });
    expect(rankNeed({ grade: LEGENDARY + 1, star: 2 })).toEqual({ spirit: 8, element: 36, shards: 0 });
  });

  it("pays Immortal stars in Immortals, and the steps up in Legendaries", () => {
    // Mythic A5 is 16 of itself and 72 of its element; 3 Legendary Earth make it Immortal.
    expect(copyNeed(IMMORTAL)).toEqual({ spirit: 16, element: 75, shards: 0 });
    expect(copyNeed(ANCIENT)).toEqual({ spirit: 65, element: 664, shards: 1000 });
  });

  it("names ranks the way the game does", () => {
    expect(rankLabel({ grade: LEGENDARY, star: 3 })).toBe("Legendary A3");
    expect(rankLabel(ANCIENT_RANK)).toBe("Ancient");
    expect(SPIRIT_RANKS).toHaveLength(4 + 18 + 1);
  });

  it("says what the next step takes", () => {
    expect(nextStep({ grade: 0, star: 0 })).toMatchObject({ spirit: 3, element: 0, fodder: 0 });
    expect(nextStep({ grade: IMMORTAL, star: 2 })).toMatchObject({ spirit: 1, fodder: IMMORTAL });
    expect(nextStep({ grade: LEGENDARY + 1, star: 5 })).toMatchObject({ element: 3, fodder: LEGENDARY });
    expect(nextStep({ grade: IMMORTAL, star: 5 })).toMatchObject({ spirit: 1, fodder: LEGENDARY });
    expect(nextStep({ grade: LEGENDARY, star: 1 })).toMatchObject({ spirit: 0, element: 2 });
    expect(nextStep({ grade: LEGENDARY, star: 5 })).toMatchObject({ element: 3, rank: { grade: LEGENDARY + 1, star: 0 } });
    expect(nextStep({ grade: IMMORTAL, star: 5 })).toMatchObject({ spirit: 1, shards: 1000, rank: ANCIENT_RANK });
    expect(nextStep(ANCIENT_RANK)).toBeNull();
  });
});

describe("estimateSpirits", () => {
  it("is decided by the element for one spirit to Ancient", () => {
    const estimate = estimateSpirits([{ name: "Loar", rank: ANCIENT_RANK }], ROSTER);
    expect(estimate.limit).toBe("Earth");
    expect(estimate.shards).toBe(1000);
    expect(estimate.diamonds).toBe(estimate.batches * SPIRIT_BATCH.diamonds);
    // 729 Legendaries of Earth at a quarter of the summons, less what the bonus picks bring.
    const bare = 729 / (LEGENDARY_PER_SUMMON / 4);
    expect(estimate.summons).toBeLessThan(bare);
    expect(estimate.summons).toBeGreaterThan(bare * 0.8);
  });

  it("costs more for two spirits of one element than for one", () => {
    const one = estimateSpirits([{ name: "Loar", rank: ANCIENT_RANK }], ROSTER);
    const two = estimateSpirits(
      [
        { name: "Loar", rank: ANCIENT_RANK },
        { name: "Noah", rank: ANCIENT_RANK },
      ],
      ROSTER,
    );
    expect(two.summons).toBeGreaterThan(one.summons * 1.5);
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

  it("makes the best copy the goal's own", () => {
    const sim = settleMains(withSpares({ Loar: { 0: 3, 2: 1 } }), [{ name: "Loar", rank: ANCIENT_RANK }]);
    expect(sim.mains.Loar).toEqual({ grade: 2, star: 0 });
    expect(sim.inventory.Loar![2]).toBe(0);
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
    const sim = settleMains(withSpares({ Loar: { [LEGENDARY]: 2 }, Noah: { [LEGENDARY]: 2 } }), goals);
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
    const sim = settleMains(withSpares({ Loar: { [LEGENDARY]: 1 }, Noah: { [LEGENDARY]: 3 } }), goals);
    const star = { ...sim, mains: { ...sim.mains, Loar: { grade: LEGENDARY, star: 1 } } };
    star.inventory = { ...star.inventory, Loar: [...star.inventory.Loar!] };
    star.inventory.Loar![LEGENDARY] = 0;
    expect(upgradeGoal(star, goals, 0, ROSTER, OFF)).toBeNull();
    const step = upgradeGoal(star, goals, 0, ROSTER, { lowerAsFodder: true });
    expect(step?.to).toEqual({ grade: LEGENDARY, star: 2 });
    expect(step?.used).toEqual(["Noah"]);
  });

  it("won't pay a Mythic star in Legendaries it can't raise to Mythic", () => {
    const goals = [{ name: "Loar", rank: ANCIENT_RANK }];
    const sim = settleMains(withSpares({ Loar: { [LEGENDARY]: 1 }, Radon: { [LEGENDARY]: 10 } }), goals);
    sim.mains.Loar = { grade: LEGENDARY + 1, star: 1 };
    // Mythic A1 -> A2 takes 2 Mythic Earth, 22 Legendaries' worth: 10 isn't enough.
    expect(upgradeGoal(sim, goals, 0, ROSTER, OFF)).toBeNull();
  });

  it("raises Legendaries into Mythic fodder when a Mythic star needs it", () => {
    const goals = [{ name: "Loar", rank: ANCIENT_RANK }];
    const sim = settleMains(withSpares({ Loar: { [LEGENDARY]: 1 }, Radon: { [LEGENDARY]: 30 } }), goals);
    sim.mains.Loar = { grade: LEGENDARY + 1, star: 1 };
    // Each Mythic Earth is 4 Radon and 7 Earth Legendaries: 22 of Radon's 30.
    const step = upgradeGoal(sim, goals, 0, ROSTER, OFF);
    expect(step?.to).toEqual({ grade: LEGENDARY + 1, star: 2 });
    expect(step?.sim.inventory.Radon![LEGENDARY]).toBe(8);
  });

  it("uses a Mythic spare as Mythic fodder", () => {
    const goals = [{ name: "Loar", rank: ANCIENT_RANK }];
    const sim = settleMains(withSpares({ Loar: { [LEGENDARY]: 1 }, Radon: { [LEGENDARY + 1]: 2 } }), goals);
    sim.mains.Loar = { grade: LEGENDARY + 1, star: 1 };
    const step = upgradeGoal(sim, goals, 0, ROSTER, OFF);
    expect(step?.to).toEqual({ grade: LEGENDARY + 1, star: 2 });
    expect(step?.sim.inventory.Radon![LEGENDARY + 1]).toBe(0);
  });

  it("combines Epics into the Legendary a star needs", () => {
    const goals = [{ name: "Loar", rank: ANCIENT_RANK }];
    const sim = settleMains(withSpares({ Loar: { [LEGENDARY]: 1, [EPIC]: 4 } }), goals);
    const step = upgradeGoal(sim, goals, 0, ROSTER, OFF);
    expect(step?.to).toEqual({ grade: LEGENDARY, star: 1 });
    expect(step?.sim.inventory.Loar![EPIC]).toBe(0);
  });

  it("needs the light shards for Ancient", () => {
    const goals = [{ name: "Loar", rank: ANCIENT_RANK }];
    const sim = settleMains(withSpares({ Loar: { [LEGENDARY]: 2 } }), goals);
    sim.mains.Loar = { grade: IMMORTAL, star: 5 };
    expect(upgradeGoal(sim, goals, 0, ROSTER, OFF)).toBeNull();
    const done = upgradeAll({ ...sim, shards: 1000 }, goals, ROSTER, OFF);
    expect(done.sim.mains.Loar).toEqual(ANCIENT_RANK);
    expect(done.sim.shards).toBe(0);
    expect(goalsReached(done.sim, goals)).toBe(true);
  });

  it("reaches Ancient from 65 Legendary Loar, 664 Legendary Earth and 1,000 shards", () => {
    const goals = [{ name: "Loar", rank: ANCIENT_RANK }];
    const sim = withSpares({ Loar: { [LEGENDARY]: 65 }, Radon: { [LEGENDARY]: 700 } });
    const done = upgradeAll({ ...sim, shards: 1000 }, goals, ROSTER, OFF);
    expect(done.sim.mains.Loar).toEqual(ANCIENT_RANK);
    const short = upgradeAll({ ...withSpares({ Loar: { [LEGENDARY]: 65 }, Radon: { [LEGENDARY]: 600 } }), shards: 1000 }, goals, ROSTER, OFF);
    expect(short.sim.mains.Loar).not.toEqual(ANCIENT_RANK);
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
