import { describe, expect, it } from "vitest";
import spiritsData from "@/data/optimizer/spirits.json";
import { simulateFight, type FightInput, type FightSkill } from "./battle";
import { noSpiritSkills, spiritSkillEffects, type SpiritSkillData } from "./spirit-skills";

const SKILLS = new Map(spiritsData.spirits.map((s) => [s.name, s.skill as SpiritSkillData]));
const at = (spirit: string, level: number) => ({ spirit, skill: SKILLS.get(spirit)!, level });

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

describe("spiritSkillEffects", () => {
  it("reads each skill's value at its level", () => {
    const effects = spiritSkillEffects([at("Noah", 5), at("Sala", 5), at("Loar", 5), at("Mum", 3), at("Herh", 2), at("Ark", 1), at("Bo", 5)]);
    expect(effects.lastFight).toEqual({ multiplier: 2, seconds: 5 });
    expect(effects.breath).toEqual({ every: 12, share: 0.1 });
    expect(effects.bossSkillDamage).toBeCloseTo(0.8);
    expect(effects.monsterSkillDamage).toBeCloseTo(0.35);
    expect(effects.cooldownRecovery).toEqual({ every: 10, share: 0.045 });
    expect(effects.timeStop).toEqual({ at: 8, seconds: 4 });
    expect(effects.hp).toBeCloseTo(5);
    expect(effects.active).toContain("Last Fight V (Noah)");
  });

  it("leaves out a level with no known value", () => {
    const effects = spiritSkillEffects([at("Bo", 3)]);
    expect(effects.hp).toBe(0);
    expect(effects.unknown).toEqual(["Wild Heart III (Bo)"]);
  });
});

describe("spirit skills in the fight", () => {
  it("doubles the damage of the last seconds with Last Fight", () => {
    const spirits = { ...noSpiritSkills(), lastFight: { multiplier: 2, seconds: 5 } };
    // Basics at 0..9: the ones at 5..9 are doubled.
    expect(simulateFight({ ...base, spirits }).total).toBeCloseTo(1500);
  });

  it("stores Breath of Fire in a storing Rave like any other damage", () => {
    const rave: FightSkill = {
      name: "Rave", element: null, kind: "attack", trigger: "seconds", every: 60, duration: 5, delay: 0, startAt: 10, freezes: false, bonus: 0,
      effect: { type: "rave", power: 1.1 },
    };
    const spirits = { ...noSpiritSkills(), breath: { every: 12, share: 0.1 } };
    // Rave stops the timer for its 5 seconds, so a 16-second fight runs 21 seconds: one breath, at 12.
    const result = simulateFight({ ...base, duration: 16, skills: [rave], spirits, enemyHp: 100_000 });
    // Stored from 10s to 15s: basics at 10..14 (500) and the 12s breath of the HP left then.
    const breath = result.bySkill["Breath of Fire"] ?? 0;
    expect(result.bySkill.Rave).toBeCloseTo((500 + breath) * 1.1, -1);
  });

  it("takes a share of the remaining HP every 12 seconds with Breath of Fire", () => {
    const spirits = { ...noSpiritSkills(), breath: { every: 12, share: 0.1 } };
    const result = simulateFight({ ...base, duration: 13, spirits, enemyHp: 100_000 });
    expect(result.bySkill["Breath of Fire"]).toBeCloseTo((100_000 - 1200) * 0.1, -1);
  });

  it("raises skill damage against the matching enemy only", () => {
    const slash: FightSkill = {
      name: "Slash", element: null, kind: "attack", trigger: "seconds", every: 100, duration: 0, delay: 0, startAt: 0, freezes: false, bonus: 0,
      effect: { type: "damage", power: 1, hits: 1 },
    };
    const spirits = { ...noSpiritSkills(), bossSkillDamage: 0.8, monsterSkillDamage: 0.5 };
    expect(simulateFight({ ...base, skills: [slash], spirits }).bySkill.Slash).toBeCloseTo(180);
    expect(simulateFight({ ...base, skills: [slash], spirits, bossMonster: false }).bySkill.Slash).toBeCloseTo(150);
  });

  it("strikes first and executes normal monsters, never bosses", () => {
    const spirits = { ...noSpiritSkills(), firstStrike: 0.25, execute: 0.3 };
    const normal = simulateFight({ ...base, spirits, enemyHp: 1000, bossMonster: false });
    expect(normal.bySkill["Thief Wind"]).toBeCloseTo(250);
    // 100 + 250 after the first hit; the 5th basic takes it to 750 (25% left), so it's executed.
    expect(normal.bySkill["Judge's Torpedo"]).toBeCloseTo(250);
    const boss = simulateFight({ ...base, spirits, enemyHp: 1000 });
    expect(boss.bySkill["Thief Wind"]).toBeUndefined();
    expect(boss.total).toBeCloseTo(1000);
  });

  it("adds damage while the enemy is above 70% HP with Leveling", () => {
    const spirits = { ...noSpiritSkills(), highHpDamage: 1 };
    // 200 a hit until 300 dealt (two hits), then 100.
    expect(simulateFight({ ...base, spirits, enemyHp: 1000 }).total).toBeCloseTo(200 * 2 + 100 * 8);
  });

  it("keeps fighting through Time Freeze while the timer stands still", () => {
    const spirits = { ...noSpiritSkills(), timeStop: { at: 8, seconds: 4 } };
    const result = simulateFight({ ...base, spirits });
    expect(result.basic).toBeCloseTo(1400);
    expect(Math.max(...result.points.map((p) => p.t))).toBeLessThanOrEqual(10);
  });

  it("recovers cooldowns with Wind Force", () => {
    const slash: FightSkill = {
      name: "Slash", element: null, kind: "attack", trigger: "seconds", every: 20, duration: 0, delay: 0, startAt: 0, freezes: false, bonus: 0,
      effect: { type: "damage", power: 1, hits: 1 },
    };
    const spirits = { ...noSpiritSkills(), cooldownRecovery: { every: 10, share: 0.5 } };
    const without = simulateFight({ ...base, duration: 25, skills: [slash] });
    const withRecovery = simulateFight({ ...base, duration: 25, skills: [slash], spirits });
    expect(withRecovery.casts.length).toBeGreaterThan(without.casts.length);
  });
});
