import { describe, expect, it } from "vitest";
import { createFight, simulateFight, type FightInput, type FightSkill } from "./battle";
import { createField, FARM_WAVES, WAVE_GAP } from "./farm";

const stage = { stage: 1, name: "Test - I", mobs: 2, enemyHp: 100, bossHp: 400 };
const base: FightInput = {
  attack: 100,
  critChance: 0,
  critDamage: 1,
  deathStrikeChance: 0,
  deathStrikeDamage: 1,
  extraDamage: { Fire: 0, Water: 0, Wind: 0, Earth: 0 },
  skills: [],
  duration: 600,
  bossMonster: false,
};

describe("createField", () => {
  it("lays out 10 waves a range apart with 10 range between waves, then a box", () => {
    const field = createField(stage);
    const { enemies } = field.state();
    expect(enemies).toHaveLength(FARM_WAVES * 2 + 1);
    expect(enemies[0].position).toBe(WAVE_GAP);
    expect(enemies[1].position).toBe(WAVE_GAP + 1);
    expect(enemies[2].position).toBe(WAVE_GAP + 2 + WAVE_GAP);
    expect(enemies.at(-1)?.box).toBe(true);
    // Walking stops a range short of the first monster.
    field.move(100);
    expect(field.state().position).toBe(WAVE_GAP - 1);
    expect(field.hit(150, 1, true)).toBe(100);
    expect(field.kills()).toBe(1);
  });
});

describe("stage farming fights", () => {
  it("walks, kills every monster and the box, and ends there", () => {
    const result = createFight({ ...base, farm: stage });
    result.advance(10_000);
    const state = result.state();
    expect(state.field?.cleared).toBe(true);
    expect(state.field?.kills).toBe(FARM_WAVES * 2 + 1);
    expect(state.total).toBeCloseTo(100 * (FARM_WAVES * 2 + 1));
    expect(state.clearedAt).toBeGreaterThan(0);
    expect(state.done).toBe(true);
  });

  it("charges the slayer forward with a dashing attack", () => {
    const charge = (dash: "farthest" | "through", range: number): FightSkill => ({
      name: "Charge", element: null, kind: "attack", trigger: "seconds", every: 100, duration: 0, delay: 0, startAt: 0, freezes: false, bonus: 0,
      range, dash, effect: { type: "damage", power: 0.01, hits: 1 },
    });
    const walkedTo = (skill: FightSkill) => {
      const fight = createFight({ ...base, farm: { ...stage, enemyHp: 1e9 }, skills: [skill] });
      // The charge goes as soon as wave 1 (10 range away) comes within its range.
      fight.advance(3);
      return fight.state().field!.position;
    };
    // Range 3 reaches wave 1's first monster from 7 away; it survives, so the charge stops beside it.
    expect(walkedTo(charge("farthest", 3))).toBe(WAVE_GAP - 1);
    // Supersonic-style batches stop at the first monster they didn't kill, and the next batch starts from there.
    const blocked = createFight({ ...base, farm: { ...stage, enemyHp: 1e9 }, skills: [{ ...charge("through", 7), effect: { type: "damage", power: 0.01, hits: 6 } }] });
    // The batches come CHARGE_SECONDS apart.
    blocked.advance(2.5);
    expect(blocked.state().field!.position).toBe(WAVE_GAP - 1);
    expect(blocked.state().events.filter((e) => e.kind === "charge")).toHaveLength(6);
    // Killing what they reach, all 6 batches charge on: 3 → 10 → 17 → 24 → 31 → 38 → 45.
    const sweeping = createFight({ ...base, farm: stage, skills: [{ ...charge("through", 7), effect: { type: "damage", power: 10, hits: 6 } }] });
    sweeping.advance(2.5);
    expect(sweeping.state().field!.position).toBeGreaterThanOrEqual(45);
    expect(sweeping.state().field!.kills).toBeGreaterThanOrEqual(6);
  });

  it("charges Fulgurous-style skills forward even with nothing in reach", () => {
    const fulgurous: FightSkill = {
      name: "Fulgurous", element: null, kind: "attack", trigger: "seconds", every: 0.5, duration: 0, delay: 0, startAt: 0, freezes: false, bonus: 0,
      range: 3, dash: "farthest", castsAnyway: true, effect: { type: "damage", power: 0.01, hits: 1 },
    };
    const fight = createFight({ ...base, farm: { ...stage, enemyHp: 1e9 }, skills: [fulgurous] });
    fight.advance(0.05);
    // The first cast at the start charges 3 range with no monster anywhere near.
    expect(fight.state().field!.position).toBeGreaterThanOrEqual(3);
  });

  it("lands meteor strikes on random tiles, hitting only what stands there", () => {
    const meteors: FightSkill = {
      name: "Ice Shower", element: null, kind: "attack", trigger: "seconds", every: 100, duration: 0, delay: 0, startAt: 0, freezes: false, bonus: 0,
      range: 8, randomTiles: true, effect: { type: "damage", power: 1, hits: 12 },
    };
    const fight = createFight({ ...base, farm: { ...stage, enemyHp: 1e9 }, skills: [meteors] });
    fight.advance(1);
    const state = fight.state();
    const strikes = state.events.find((e) => e.name === "Ice Shower")!;
    expect(strikes.targets).toHaveLength(12);
    // Only strikes on the two monsters' tiles dealt damage.
    const onMonsters = strikes.targets!.filter((t) => t === WAVE_GAP || t === WAVE_GAP + 1).length;
    expect(state.bySkill["Ice Shower"] ?? 0).toBeCloseTo(onMonsters * 100);
  });

  it("hits at most the enemies a skill names", () => {
    const slash: FightSkill = {
      name: "Lightning Slash", element: null, kind: "attack", trigger: "seconds", every: 100, duration: 0, delay: 0, startAt: 0, freezes: false, bonus: 0,
      range: 30, maxTargets: 1, effect: { type: "damage", power: 1, hits: 1 },
    };
    const fight = createFight({ ...base, farm: { ...stage, enemyHp: 1e9 }, skills: [slash] });
    fight.advance(0.05);
    expect(fight.state().bySkill["Lightning Slash"]).toBeCloseTo(100);
  });

  it("walks faster with movement speed buffs", () => {
    const agile: FightSkill = {
      name: "Agile", element: null, kind: "buff", trigger: "seconds", every: 100, duration: 10, delay: 0, startAt: 0, freezes: false, bonus: 0,
      effect: { type: "mspd", power: 1 },
    };
    const plain = createFight({ ...base, farm: { ...stage, enemyHp: 1e12 } });
    const fast = createFight({ ...base, farm: { ...stage, enemyHp: 1e12 }, skills: [agile] });
    plain.advance(1);
    fast.advance(1);
    expect(fast.state().field!.position).toBeGreaterThan(plain.state().field!.position * 1.8);
    // A mounted beast's MSPD raises the walk through the stats' movement speed.
    const mounted = createFight({ ...base, farm: { ...stage, enemyHp: 1e12 }, movementSpeed: 1.5 });
    mounted.advance(1);
    expect(mounted.state().moveSpeed).toBeCloseTo(7.5);
  });

  it("hits every monster in a skill's range, and readies a bat after its kills", () => {
    const sweep: FightSkill = {
      name: "Sweep", element: null, kind: "attack", trigger: "seconds", every: 1, duration: 0, delay: 0, startAt: 0, freezes: false, bonus: 0, range: 5,
      effect: { type: "damage", power: 2, hits: 1 },
    };
    const bat: FightSkill = {
      name: "Bat", element: null, kind: "passive", trigger: "kills", every: 4, duration: 30, delay: 0, startAt: 0, freezes: false, bonus: 0, uncharged: true,
      effect: { type: "mspd", power: 1 },
    };
    const result = simulateFight({ ...base, farm: stage, skills: [sweep, bat] });
    // One sweep of 200 kills both monsters of a wave.
    expect(result.bySkill.Sweep).toBeGreaterThanOrEqual(200);
    expect(result.casts.some((c) => c.name === "Bat")).toBe(true);
  });
});
