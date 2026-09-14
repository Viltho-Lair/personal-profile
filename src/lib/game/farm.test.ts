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
    // Range 3 reaches wave 1's first monster from 7 away, and the charge stops on it.
    expect(walkedTo(charge("farthest", 3))).toBe(WAVE_GAP);
    // Supersonic-style goes its whole range: from 3 (wave 1 just in reach) it charges to 10, carrying the monsters it passes along.
    const through = createFight({ ...base, farm: { ...stage, enemyHp: 1e9 }, skills: [charge("through", 7)] });
    through.advance(3);
    const state = through.state().field!;
    expect(state.position).toBeGreaterThanOrEqual(WAVE_GAP);
    expect(state.enemies.filter((e) => e.wave === 1 && e.hp > 0).every((e) => e.position === state.position + 1)).toBe(true);
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
