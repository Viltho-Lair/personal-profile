import { describe, expect, it } from "vitest";
import { expectedHit, simulateFight, withStones, type FightInput, type FightSkill } from "./battle";

const base: FightInput = {
  attack: 100,
  critChance: 0,
  critDamage: 1,
  deathStrikeChance: 0,
  deathStrikeDamage: 1,
  extraDamage: { Fire: 0, Water: 0, Wind: 0, Earth: 0 },
  skills: [],
  duration: 10,
};

const skill = (s: Partial<FightSkill> & Pick<FightSkill, "name" | "effect">): FightSkill => ({
  element: "Fire",
  kind: "attack",
  trigger: "seconds",
  every: 10,
  duration: 0,
  delay: 0,
  startAt: 0,
  freezes: false,
  bonus: 0,
  ...s,
});

describe("expectedHit", () => {
  it("weights crit and death strike by their chances", () => {
    expect(expectedHit(100, { critChance: 0.5, critDamage: 3, deathStrikeChance: 0, deathStrikeDamage: 1 })).toBeCloseTo(200);
    expect(expectedHit(100, { critChance: 1, critDamage: 3, deathStrikeChance: 1, deathStrikeDamage: 2 })).toBeCloseTo(600);
  });
});

describe("simulateFight", () => {
  it("lands a basic attack every second, hit by hit", () => {
    const result = simulateFight(base);
    expect(result.basic).toBeCloseTo(1000);
    expect(result.points).toHaveLength(11);
  });

  it("fires hit-based skills after that many basic attacks and pauses basics for the cast", () => {
    const slash = skill({ name: "Slash", trigger: "hits", every: 3, effect: { type: "damage", power: 2, hits: 1 } });
    const result = simulateFight({ ...base, skills: [slash] });
    const castTimes = result.casts.map((c) => c.t);
    expect(castTimes.length).toBe(3);
    expect(castTimes[0]).toBeGreaterThan(2);
    expect(result.basic).toBeLessThan(1000);
  });

  it("keeps a buff for its duration and grows stacks over time", () => {
    const buff = skill({ name: "Buff", kind: "buff", every: 100, duration: 4, effect: { type: "atk", power: 1 } });
    const buffed = simulateFight({ ...base, skills: [buff] });
    // basics at ~0.3, 1.3, 2.3, 3.3 are doubled; the rest aren't
    expect(buffed.basic).toBeGreaterThan(1300);
    expect(buffed.basic).toBeLessThan(1500);

    const stack = skill({ name: "Stack", kind: "passive", every: 5, effect: { type: "atkStack", power: 0.5 } });
    const stacked = simulateFight({ ...base, skills: [stack] });
    expect(stacked.basic).toBeCloseTo(100 * 5 + 150 * 5, -1);
  });

  it("stops the clock for Rave and adds its share of the damage done meanwhile", () => {
    const rave = skill({ name: "Rave", element: null, every: 60, duration: 5, effect: { type: "rave", power: 1 } });
    const result = simulateFight({ ...base, skills: [rave] });
    // five free seconds of basics, doubled by Rave, on top of the normal ten
    expect(result.bySkill.Rave).toBeGreaterThan(400);
    expect(result.basic).toBeGreaterThan(1300);
    expect(result.points[result.points.length - 1].t).toBeCloseTo(10, 0);
  });

  it("readies an attack-cast buff after that many attack skill casts", () => {
    const slash = skill({ name: "Slash", every: 1, effect: { type: "damage", power: 1, hits: 1 } });
    const wolf = skill({ name: "Wolf", element: null, kind: "passive", trigger: "attackCasts", every: 3, duration: 10, effect: { type: "atk", power: 1 } });
    const result = simulateFight({ ...base, skills: [slash, wolf] });
    const wolfCasts = result.casts.filter((c) => c.name === "Wolf");
    expect(wolfCasts.length).toBeGreaterThanOrEqual(1);
    expect(wolfCasts[0].t).toBeGreaterThan(2);
    expect(result.basic).toBeGreaterThan(simulateFight({ ...base, skills: [slash] }).basic);
  });

  it("multiplies element skills by their amp and every hit by boss damage", () => {
    const slash = skill({ name: "Slash", every: 100, effect: { type: "damage", power: 1, hits: 1 } });
    const plain = simulateFight({ ...base, skills: [slash] });
    const amped = simulateFight({ ...base, skills: [slash], elementAmp: { Fire: 1, Water: 0, Wind: 0, Earth: 0 }, bossDamage: 0.5 });
    expect(amped.bySkill.Slash).toBeCloseTo(plain.bySkill.Slash * 3);
    expect(amped.basic).toBeCloseTo(plain.basic * 1.5);
  });

  it("applies skill stones only to their element", () => {
    const s = skill({ name: "Buff", element: "Water", kind: "buff", every: 20, duration: 10, effect: { type: "atk", power: 1 } });
    const stones = { cooldown: { grade: "B" as const, element: "Water" as const }, time: { grade: "A" as const, element: "Water" as const }, heat: null };
    const stoned = withStones(s, stones);
    expect(stoned.every).toBeCloseTo(18.6);
    expect(stoned.duration).toBeCloseTo(10.4);
    expect(withStones({ ...s, element: "Fire" }, stones).every).toBe(20);
  });
});
