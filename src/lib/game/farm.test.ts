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
