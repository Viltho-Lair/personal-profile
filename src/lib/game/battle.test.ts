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

  it("uses a hit-based skill at the start, then after that many basic attacks, pausing basics for the cast", () => {
    const slash = skill({ name: "Slash", trigger: "hits", every: 3, effect: { type: "damage", power: 2, hits: 1 } });
    const result = simulateFight({ ...base, skills: [slash] });
    const castTimes = result.casts.map((c) => c.t);
    expect(castTimes[0]).toBe(0);
    expect(castTimes[1]).toBeGreaterThan(2);
    expect(castTimes.length).toBe(4);
    expect(result.basic).toBeLessThan(1000);
  });

  it("doesn't start a passive that waits for strikes ready", () => {
    const passive = skill({ name: "Passive", kind: "passive", trigger: "hits", every: 3, effect: { type: "damage", power: 1, hits: 1 } });
    expect(simulateFight({ ...base, skills: [passive] }).casts[0]?.t).toBeGreaterThan(2);
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
    const stored = fight.state().skills[0].stored!;
    const clock = fight.state().clock;
    expect(fight.cast("Rave")).toBe(true);
    // The pillar rises after the cast and deals what was stored over 2 seconds.
    fight.advance(1.3);
    state = fight.state();
    expect(state.bySkill.Rave).toBeGreaterThan(stored * 0.4);
    expect(state.bySkill.Rave).toBeLessThan(stored * 0.6);
    expect(state.raveStopping).toBe(true);
    expect(state.skills[0]).toMatchObject({ charged: false });
    expect(state.skills[0].ready).toBe(0);
    expect(fight.cast("Rave")).toBe(false);
    fight.advance(1.1);
    state = fight.state();
    expect(state.bySkill.Rave).toBeCloseTo(stored, 0);
    // Everything held while it dealt: the battle timer and the cooldown barely moved.
    expect(state.clock - clock).toBeLessThan(0.2);
    expect(state.raveStopping).toBe(false);
  });

  it("runs the fight while Rave stores, and stops everything only while its pillar deals the damage", () => {
    const rave = skill({ name: "Rave", element: null, every: 60, duration: 5, effect: { type: "rave", power: 1 } });
    const slash = skill({ name: "Slash", every: 4, effect: { type: "damage", power: 0, hits: 1 } });
    const result = simulateFight({ ...base, skills: [rave, slash] });
    const raves = result.casts.filter((c) => c.name === "Rave");
    // Used at the start and unleashed once its 5 seconds are up, the battle timer running all along.
    expect(raves[0].t).toBeCloseTo(0, 1);
    expect(raves[1].t).toBeCloseTo(5, 0);
    expect(raves[1].real).toBeCloseTo(5, 0);
    expect(result.bySkill.Rave).toBeGreaterThan(400);
    expect(result.bySkill.Rave).toBeLessThan(600);
    // The release's 2.3 stopped seconds add no basic attacks: still the fight's 10 seconds of them.
    expect(result.basic).toBeLessThanOrEqual(1000);
    // Slash's cooldown ran while Rave stored (again at 4 seconds) and held through the pillar (8 seconds of timer is 10.3 real).
    const slashes = result.casts.filter((c) => c.name === "Slash");
    expect(slashes[1].real).toBeCloseTo(4, 0);
    expect(slashes[2].real).toBeGreaterThan(10);
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

  it("drains 0.5% of max life a second while Rage lasts, and ends Rage rather than emptying life", () => {
    const pools = { maxHp: 1000, hpRecovery: 50, maxMana: 100, manaRecovery: 0 };
    const rage = skill({ name: "Rage", kind: "buff", every: 100, duration: 10, effect: { type: "rage", power: 0, drain: 0.005 } });
    const fight = createFight({ ...base, ...pools, duration: 20, skills: [rage] });
    fight.advance(4);
    // No recovery, 5 life a second.
    expect(fight.state().hp).toBeCloseTo(1000 - 20, 0);
    expect(fight.state().recovering).toBe(false);

    const low = skill({ name: "Burn", kind: "buff", every: 100, duration: 1, hpCost: 0.995, effect: { type: "speed", power: 0 } });
    const nearlyEmpty = createFight({ ...base, ...pools, hpRecovery: 0, duration: 20, skills: [low, rage] });
    nearlyEmpty.advance(3);
    const state = nearlyEmpty.state();
    // 5 life left drains out in about a second; Rage stops just before zero and life stays above it.
    expect(state.hp).toBeGreaterThan(0);
    expect(state.skills.find((s) => s.name === "Rage")?.active).toBe(false);
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

  it("first goes 20 seconds in with Wrath of Gods, then every 30", () => {
    const wrath = skill({ name: "Wrath of Gods", kind: "passive", every: 30, firstEvery: 20, duration: 5, startsOnCooldown: true, effect: { type: "atk", power: 1 } });
    const result = simulateFight({ ...base, duration: 95, skills: [wrath] });
    expect(result.casts.map((c) => Math.round(c.t))).toEqual([20, 50, 80]);
  });

  it("lets Meditation charge Wrath of Gods only after its first cooldown", () => {
    const wrath = skill({ name: "Wrath of Gods", kind: "passive", every: 30, firstEvery: 20, duration: 5, startsOnCooldown: true, effect: { type: "atk", power: 0 } });
    const meditation = skill({ name: "Meditation", element: "Water", kind: "buff", every: 10, effect: { type: "chargeCooldowns", power: 0.5 } });
    const times = simulateFight({ ...base, duration: 60, skills: [wrath, meditation] })
      .casts.filter((c) => c.name === "Wrath of Gods")
      .map((c) => c.t);
    expect(times[0]).toBeCloseTo(20, 0);
    // After the first go, Meditation's charges bring the next one in well before another 30 seconds.
    expect(times[1] - times[0]).toBeLessThan(25);
  });

  it("casts every ready skill at once, with no wait between them", () => {
    const a = skill({ name: "A", every: 100, effect: { type: "damage", power: 1, hits: 1 } });
    const b = skill({ name: "B", every: 100, effect: { type: "damage", power: 1, hits: 1 } });
    const buff = skill({ name: "Buff", kind: "buff", every: 100, duration: 5, effect: { type: "atk", power: 0 } });
    const casts = simulateFight({ ...base, skills: [a, b, buff] }).casts;
    expect(casts.map((c) => c.t)).toEqual([0, 0, 0]);
  });

  it("heals a share of current life with a negative life cost, up to max life", () => {
    const pools = { maxHp: 1000, hpRecovery: 0, maxMana: 100, manaRecovery: 0 };
    const burn = skill({ name: "Warrior Burn", kind: "buff", every: 100, duration: 5, hpCost: 0.5, effect: { type: "atk", power: 0 } });
    const breath = skill({ name: "Breath of Waves", kind: "buff", every: 100, duration: 5, hpCost: -0.5, effect: { type: "cooldownRate", power: 0 } });
    const fight = createFight({ ...base, ...pools, skills: [burn, breath] });
    fight.advance(0.5);
    expect(fight.state().hp).toBeCloseTo(750);
    const full = createFight({ ...base, ...pools, skills: [breath] });
    full.advance(0.5);
    expect(full.state().hp).toBe(1000);
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

  it("charges attacks, buffs and stacking passives with Meditation, strike counts too, but not skills that wait for skill uses", () => {
    const strike = skill({ name: "Strike", trigger: "hits", every: 20, effect: { type: "damage", power: 1, hits: 1 } });
    const passive = skill({ name: "Passive", element: "Water", kind: "passive", trigger: "elementCasts", every: 2, effect: { type: "damage", power: 1, hits: 1 } });
    const water = skill({ name: "Water", element: "Water", every: 100, effect: { type: "damage", power: 0, hits: 1 } });
    const burning = skill({ name: "Burning Sword", kind: "passive", every: 5, maxStacks: 10, effect: { type: "atkStack", power: 0 } });
    const speedSword = skill({ name: "Speed Sword", kind: "passive", trigger: "hits", every: 5, maxStacks: 10, effect: { type: "speedStack", power: 0 } });
    const slash = skill({ name: "Slash", every: 20, startsOnCooldown: false, effect: { type: "damage", power: 1, hits: 1 } });
    const buff = skill({ name: "Buff", kind: "buff", every: 20, duration: 1, effect: { type: "atk", power: 0 } });
    const meditation = skill({ name: "Meditation", element: "Water", kind: "buff", every: 100, startAt: 2, effect: { type: "chargeCooldowns", power: 0.5 } });
    const casts = (skills: FightSkill[], name: string) =>
      simulateFight({ ...base, duration: 30, skills }).casts.filter((c) => c.name === name).map((c) => c.t);
    // Slash and Buff go at 0; Meditation at 2s charges half of their next cooldown.
    expect(casts([slash, meditation], "Slash")[1]).toBeLessThan(casts([slash], "Slash")[1] - 5);
    expect(casts([buff, meditation], "Buff")[1]).toBeLessThan(casts([buff], "Buff")[1] - 5);
    expect(casts([strike, meditation], "Strike")[1]).toBeLessThan(casts([strike], "Strike")[1] - 5);
    // Stacking passives on seconds and on strikes are charged too: their stages come in sooner.
    expect(casts([burning, meditation], "Burning Sword")[1]).toBeLessThan(casts([burning], "Burning Sword")[1] - 1.5);
    expect(casts([speedSword, meditation], "Speed Sword")[1]).toBeLessThan(casts([speedSword], "Speed Sword")[1] - 1.5);
    // A passive waiting for 2 Water skill uses gets only 1 in the fight, and Meditation doesn't make up the other.
    expect(casts([water, passive, meditation], "Passive")).toHaveLength(0);
  });

  it("uses the familiar once a battle unless it allows more, and a beast's buff once", () => {
    const familiar = skill({ name: "Familiar", every: 30, familiar: true, maxUses: 1, effect: { type: "damage", power: 1, hits: 1 } });
    const ku = { ...familiar, every: 20, maxUses: 2 };
    const wolf = skill({ name: "Gray Wolf", kind: "passive", trigger: "attackCasts", every: 1, duration: 10, uncharged: true, maxUses: 1, effect: { type: "atk", power: 0 } });
    const slash = skill({ name: "Slash", every: 5, effect: { type: "damage", power: 0, hits: 1 } });
    const uses = (skills: FightSkill[], name: string) => simulateFight({ ...base, duration: 120, skills }).casts.filter((c) => c.name === name).map((c) => c.t);
    expect(uses([familiar], "Familiar")).toEqual([0]);
    const kuUses = uses([ku], "Familiar");
    expect(kuUses).toHaveLength(2);
    expect(kuUses[1]).toBeCloseTo(20, 0);
    // Slash goes every 5 seconds, but the wolf's buff comes only after the first.
    expect(uses([slash, wolf], "Gray Wolf")).toHaveLength(1);
    // Spent, it can't be cast by hand either.
    const fight = createFight({ ...base, duration: 120, skills: [familiar], manual: ["Familiar"] });
    expect(fight.cast("Familiar")).toBe(true);
    fight.advance(60);
    expect(fight.cast("Familiar")).toBe(false);
    expect(fight.state().skills[0].complete).toBe(true);
  });

  it("repeats Pe's familiar attack one hit after another instead of all at once", () => {
    const pe = skill({ name: "Familiar", every: 30, familiar: true, maxUses: 1, hitEvery: 1, effect: { type: "damage", power: 1, hits: 5 } });
    const fight = createFight({ ...base, duration: 30, skills: [pe] });
    fight.advance(0.5);
    expect(fight.state().bySkill.Familiar).toBeCloseTo(100);
    fight.advance(4);
    expect(fight.state().bySkill.Familiar).toBeCloseTo(500);
    expect(fight.state().events.find((e) => e.kind === "familiar")?.gap).toBe(1);
  });

  it("uses the familiar for its hits and damage, and readies its specials with each use", () => {
    const familiar = skill({ name: "Familiar", element: "Fire", every: 30, familiar: true, effect: { type: "damage", power: 4, hits: 3 } });
    const rion = skill({ name: "Rion", kind: "passive", trigger: "familiarCasts", every: 1, duration: 10, uncharged: true, effect: { type: "speed", power: 1 } });
    const result = simulateFight({ ...base, skills: [familiar, rion], enemyElement: "Earth" });
    // Used at 0s: 3 hits of 4x ATK, x2 on Earth.
    expect(result.bySkill.Familiar).toBeCloseTo(100 * 4 * 3 * 2);
    expect(result.casts.filter((c) => c.name === "Rion")).toHaveLength(1);
    // Rion's ATK SPD doubles the basic attacks for its 10 seconds.
    expect(result.basic).toBeGreaterThan(1000);
    const manual = createFight({ ...base, skills: [familiar], manual: ["Familiar"] });
    manual.advance(5);
    expect(manual.state().bySkill.Familiar).toBeUndefined();
    expect(manual.cast("Familiar")).toBe(true);
  });

  it("hits an element-restricted enemy x2, x0.7 or x1 by element", () => {
    const fire = skill({ name: "Fire", every: 100, effect: { type: "damage", power: 1, hits: 1 } });
    const hit = (enemyElement: "Earth" | "Water" | "Wind" | null) => simulateFight({ ...base, skills: [fire], enemyElement }).bySkill.Fire;
    expect(hit("Earth")).toBeCloseTo(200);
    expect(hit("Water")).toBeCloseTo(70);
    expect(hit("Wind")).toBeCloseTo(100);
    expect(hit(null)).toBeCloseTo(100);
  });

  it("raises boss damage once a draco's stacking skill maxes out, and leaves boars to their knockbacks", () => {
    const stack = skill({ name: "Burning Sword", kind: "passive", every: 1, maxStacks: 3, effect: { type: "atkStack", power: 0 } });
    const draco = skill({ name: "Fire Draco", kind: "passive", trigger: "stacksComplete", watch: "Burning Sword", every: 1, duration: 60, uncharged: true, effect: { type: "bossDamage", power: 1 } });
    const result = simulateFight({ ...base, skills: [stack, draco] });
    // Stacks complete at 3s: basics from then on deal x2.
    expect(result.casts.find((c) => c.name === "Fire Draco")?.t).toBeCloseTo(3, 0);
    expect(result.basic).toBeGreaterThan(1500);
    expect(simulateFight({ ...base, skills: [stack, draco], bossMonster: false }).basic).toBeCloseTo(1000);

    const boar = skill({ name: "Boar", kind: "passive", every: 60, startsOnCooldown: true, uncharged: true, duration: 30, effect: { type: "atk", power: 1 } });
    const meditation = skill({ name: "Meditation", kind: "buff", every: 1, effect: { type: "chargeCooldowns", power: 0.9 } });
    expect(simulateFight({ ...base, duration: 30, skills: [boar, meditation] }).casts.some((c) => c.name === "Boar")).toBe(false);
  });

  it("releases Rave's stored damage as it is, without the boss damage again", () => {
    const rave = skill({ name: "Rave", element: null, every: 60, duration: 5, effect: { type: "rave", power: 1.1 } });
    const result = simulateFight({ ...base, duration: 20, bossDamage: 8.5, skills: [rave] });
    // Five basic attacks of 100 x 9.5 are stored, and 110% of that comes back.
    expect(result.bySkill.Rave).toBeCloseTo(5 * 950 * 1.1, -2);
    expect(result.releases).toHaveLength(1);
    expect(result.releases[0].amount).toBeCloseTo(result.bySkill.Rave ?? 0);
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
