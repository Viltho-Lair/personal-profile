import { describe, expect, it } from "vitest";
import { createFight, expectedHit, simulateFight, withStones, type FightInput, type FightSkill } from "./battle";

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

  it("holds Rave's stored damage until it's pressed again, and only then starts its cooldown", () => {
    const rave = skill({ name: "Rave", element: null, every: 20, duration: 5, effect: { type: "rave", power: 1 } });
    const fight = createFight({ ...base, duration: 60, skills: [rave], manual: ["Rave"] });
    expect(fight.cast("Rave")).toBe(true);
    fight.advance(8);
    let state = fight.state();
    expect(state.skills[0]).toMatchObject({ charged: true, ready: 1 });
    expect(state.skills[0].stored).toBeGreaterThan(400);
    expect(state.bySkill.Rave).toBeUndefined();
    // Waiting doesn't run the cooldown.
    fight.advance(30);
    expect(fight.state().skills[0].charged).toBe(true);
    expect(fight.cast("Rave")).toBe(true);
    fight.advance(0.1);
    state = fight.state();
    expect(state.bySkill.Rave).toBeGreaterThan(400);
    expect(state.skills[0]).toMatchObject({ charged: false });
    expect(state.skills[0].ready).toBeLessThan(0.05);
    expect(fight.cast("Rave")).toBe(false);
  });

  it("stores five seconds of the fight's damage with Rave while the clock keeps running", () => {
    const rave = skill({ name: "Rave", element: null, every: 60, duration: 5, effect: { type: "rave", power: 1 } });
    const result = simulateFight({ ...base, skills: [rave] });
    const released = result.casts.filter((c) => c.name === "Rave").map((c) => c.t);
    // Used at the start, unleashed once the five seconds are up.
    expect(released[0]).toBeCloseTo(0, 0);
    expect(released[1]).toBeCloseTo(5, 0);
    expect(result.bySkill.Rave).toBeGreaterThan(400);
    expect(result.bySkill.Rave).toBeLessThan(600);
    // No free seconds of basics any more: the fight clock never stopped for the storing.
    expect(result.basic).toBeLessThanOrEqual(1000);
  });

  it("keeps Rave's share proportional to what it stored", () => {
    const rave = (power: number) => skill({ name: "Rave", element: null, every: 60, duration: 5, effect: { type: "rave", power } });
    const once = simulateFight({ ...base, skills: [rave(1)] }).bySkill.Rave ?? 0;
    const twice = simulateFight({ ...base, skills: [rave(2)] }).bySkill.Rave ?? 0;
    expect(twice).toBeCloseTo(once * 2);
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

  it("stops a stacking passive once its stages are complete", () => {
    const stack = skill({ name: "Speed Sword", kind: "passive", trigger: "hits", every: 2, maxStacks: 3, effect: { type: "speedStack", power: 0.1 } });
    const result = simulateFight({ ...base, skills: [stack] });
    expect(result.casts.filter((c) => c.name === "Speed Sword")).toHaveLength(3);
  });

  it("waits for mana, spends life on Lightning Body and grows Rage with missing life", () => {
    const pools = { maxHp: 1000, hpRecovery: 0, maxMana: 50, manaRecovery: 0 };
    const slash = skill({ name: "Slash", every: 1, mpCost: 30, effect: { type: "damage", power: 1, hits: 1 } });
    const starved = simulateFight({ ...base, ...pools, skills: [slash] });
    expect(starved.casts).toHaveLength(1);
    const waiting = createFight({ ...base, ...pools, skills: [slash] });
    waiting.advance(2);
    expect(waiting.state().mana).toBeCloseTo(20);
    expect(waiting.state().skills[0]).toMatchObject({ mpCost: 30, waitingForMana: true });

    const body = skill({ name: "Lightning Body", element: "Wind", kind: "buff", every: 100, duration: 5, hpCost: 0.5, effect: { type: "speed", power: 1 } });
    const fight = createFight({ ...base, ...pools, skills: [body] });
    fight.advance(1);
    expect(fight.state().hp).toBeCloseTo(500);
    expect(fight.state().attacksPerSecond).toBeCloseTo(2);

    const rage = skill({ name: "Rage", kind: "buff", every: 100, duration: 20, effect: { type: "rage", power: 0.02 } });
    const raged = simulateFight({ ...base, ...pools, skills: [body, rage] });
    const plain = simulateFight({ ...base, ...pools, skills: [body] });
    // 50% life missing: +100% ATK on the basics
    expect(raged.basic).toBeGreaterThan(plain.basic * 1.8);
  });

  it("doesn't let cheaper skills keep taking the mana a costlier skill ahead of them waits for", () => {
    const pools = { maxHp: 1000, hpRecovery: 0, maxMana: 60, manaRecovery: 10 };
    const cheap = skill({ name: "Cheap", every: 3, mpCost: 25, effect: { type: "damage", power: 1, hits: 1 } });
    const costly = skill({ name: "Costly", kind: "buff", every: 3, mpCost: 50, duration: 1, effect: { type: "atk", power: 0 } });
    const result = simulateFight({ ...base, ...pools, duration: 30, skills: [cheap, costly] });
    expect(result.casts.filter((c) => c.name === "Costly").length).toBeGreaterThanOrEqual(3);
  });

  it("raises mana recovery with Mana's Blessing and refills life and mana with Life Mana", () => {
    const pools = { maxHp: 1000, hpRecovery: 0, maxMana: 100, manaRecovery: 10 };
    const blessing = skill({ name: "Mana's Blessing", kind: "passive", trigger: "always", effect: { type: "manaRecovery", power: 1 } });
    const drain = skill({ name: "Lightning Body", kind: "buff", every: 100, duration: 1, hpCost: 0.5, mpCost: 80, effect: { type: "speed", power: 0 } });
    const blessed = createFight({ ...base, ...pools, skills: [drain, blessing] });
    blessed.advance(2);
    expect(blessed.state().manaRecovery).toBe(20);
    expect(blessed.state().mana).toBeGreaterThan(55);

    const lifeMana = skill({ name: "Life Mana", kind: "buff", every: 3, effect: { type: "restore", hp: 0.3, mana: 0.3 } });
    const restored = createFight({ ...base, ...pools, manaRecovery: 0, skills: [drain, lifeMana] });
    restored.advance(0.5);
    expect(restored.state().hp).toBeCloseTo(800);
    expect(restored.state().mana).toBeCloseTo(50);
  });

  it("holds basic attacks back only for a skill's own animation", () => {
    const slow = skill({ name: "Slash", every: 1, effect: { type: "damage", power: 0, hits: 1 } });
    const fast = { ...slow, animation: 0.05 };
    expect(simulateFight({ ...base, skills: [fast] }).basic).toBeGreaterThan(simulateFight({ ...base, skills: [slow] }).basic);
  });

  it("holds a skill with auto off until it's cast by hand", () => {
    const slash = skill({ name: "Slash", every: 100, effect: { type: "damage", power: 1, hits: 1 } });
    const fight = createFight({ ...base, skills: [slash], manual: ["Slash"] });
    fight.advance(2);
    expect(fight.state().casts).toHaveLength(0);
    expect(fight.state().skills[0]).toMatchObject({ ready: 1, manual: true });
    expect(fight.cast("Slash")).toBe(true);
    fight.advance(0.1);
    expect(fight.state().casts).toHaveLength(1);
    expect(fight.cast("Slash")).toBe(false);
  });

  it("charges required strikes with Meditation too", () => {
    const strike = skill({ name: "Strike", trigger: "hits", every: 20, effect: { type: "damage", power: 1, hits: 1 } });
    const meditation = skill({ name: "Meditation", element: "Water", kind: "buff", every: 100, effect: { type: "chargeCooldowns", power: 0.5 } });
    const first = (skills: FightSkill[]) => simulateFight({ ...base, duration: 30, skills }).casts.find((c) => c.name === "Strike")?.t ?? 99;
    expect(first([strike, meditation])).toBeLessThan(first([strike]) - 5);
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
