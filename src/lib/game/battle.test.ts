import { describe, expect, it } from "vitest";
import { expectedHit, simulateBattle, withStones, type BattleInput, type BattleSkill } from "./battle";

const base: BattleInput = {
  attack: 100,
  critChance: 0,
  critDamage: 1,
  deathStrikeChance: 0,
  deathStrikeDamage: 1,
  extraDamage: { Fire: 0, Water: 0, Wind: 0, Earth: 0 },
  skills: [],
  duration: 10,
};

describe("expectedHit", () => {
  it("weights crit and death strike by their chances", () => {
    expect(expectedHit(100, { critChance: 0.5, critDamage: 3, deathStrikeChance: 0, deathStrikeDamage: 1 })).toBeCloseTo(200);
    expect(expectedHit(100, { critChance: 1, critDamage: 3, deathStrikeChance: 1, deathStrikeDamage: 2 })).toBeCloseTo(600);
  });
});

describe("simulateBattle", () => {
  it("deals one expected hit per second without skills", () => {
    const result = simulateBattle(base);
    expect(result.total).toBeCloseTo(1000);
    expect(result.points).toHaveLength(11);
    expect(result.points[5].damage).toBeCloseTo(500);
  });

  it("casts damage skills on cooldown with their element bonus", () => {
    const slash: BattleSkill = { name: "Slash", element: "Fire", cooldown: 4, effect: { kind: "damage", power: 2, hits: 1 } };
    const result = simulateBattle({ ...base, skills: [slash], extraDamage: { ...base.extraDamage, Fire: 0.5 } });
    // casts at 0, 4 and 8 seconds: 3 x 100 x 200% x 1.5
    expect(result.bySkill.Slash).toBeCloseTo(900);
    expect(result.total).toBeCloseTo(1900);
  });

  it("raises damage while a timed ATK buff is up and stacks over time", () => {
    const buff: BattleSkill = { name: "Buff", element: "Fire", cooldown: 10, effect: { kind: "atkBuff", power: 1, duration: 5, startAt: 0 } };
    expect(simulateBattle({ ...base, skills: [buff] }).total).toBeCloseTo(1500);
    const stack: BattleSkill = { name: "Stack", element: "Earth", cooldown: 0, effect: { kind: "atkStack", power: 0.1, every: 5, per: "seconds" } };
    expect(simulateBattle({ ...base, skills: [stack] }).total).toBeCloseTo(1050);
  });

  it("applies skill stones only to their element", () => {
    const skill: BattleSkill = { name: "Buff", element: "Water", cooldown: 20, effect: { kind: "atkBuff", power: 1, duration: 10, startAt: 0 } };
    const stones = { cooldown: { grade: "B" as const, element: "Water" as const }, time: { grade: "A" as const, element: "Water" as const }, heat: null };
    const stoned = withStones(skill, stones);
    expect(stoned.cooldown).toBeCloseTo(18.6);
    expect(stoned.effect.kind === "atkBuff" && stoned.effect.duration).toBeCloseTo(10.4);
    expect(withStones({ ...skill, element: "Fire" }, stones).cooldown).toBe(20);
  });
});
