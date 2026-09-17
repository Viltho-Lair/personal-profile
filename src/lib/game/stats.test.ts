import { describe, expect, it } from "vitest";
import { computeStats, emptySources, type StatSources } from "./stats";

/** The workbook's sample account: enhance levels 1, a Common 4 weapon/accessory owned, Stone promotion. */
function sample(): StatSources {
  const s = emptySources();
  s.weapon = { equip: 7, owned: 2.1 };
  s.accessory = { equip: 7, owned: 2.1 };
  s.enhance = { atk: 1, hp: 10, hpRecovery: 1, critDamage: 0.01, critChance: 0.001, deathStrikeDamage: 0.01, deathStrikeChance: 0.001 };
  s.companionPromotion.atk = 0.8;
  s.slayerPromotion.atk = 0.4;
  s.memoryTree = { ...s.memoryTree, atk: 0.5, hp: 0.1, vit: 0.05 };
  return s;
}

describe("computeStats", () => {
  it("matches the workbook's sample ATK, HP, HP Recovery and CRIT DMG", () => {
    const stats = computeStats(sample());
    expect(stats.attack).toBeCloseTo(2.9457, 4);
    expect(stats.hp).toBeCloseTo(11.99, 4);
    expect(stats.hpRecovery).toBeCloseTo(1.1445, 4);
    expect(stats.critDamage).toBe(1.01);
    expect(stats.critChance).toBe(0.001);
  });

  it("starts mana, mana recovery, accuracy and dodge at the game's base values", () => {
    const stats = computeStats(emptySources());
    expect(stats).toMatchObject({ mana: 100, manaRecovery: 10, accuracy: 30, dodge: 10, extraGold: 0, extraExp: 0 });
  });

  it("multiplies gold groups and rounds down like the sheet", () => {
    const s = emptySources();
    s.relics.gold = 0.5;
    s.companions.goldRush = 0.2;
    s.spirits.gold = 0.1;
    expect(computeStats(s).extraGold).toBeCloseTo(1.5 * 1.2 * 1.1 - 1, 2);
  });

  it("multiplies each stat by its event buff on its own", () => {
    const s = sample();
    s.relics.gold = 0.5;
    s.blackOrb.boss = 0.2;
    const before = computeStats(s);
    s.event = { atk: 1, hp: 0.5, gold: 1, exp: 1, boss: 0.5, monster: 0.3 };
    const after = computeStats(s);
    expect(after.attack / before.attack).toBeCloseTo(2);
    expect(after.hp / before.hp).toBeCloseTo(1.5);
    // Gold x2 on top of the 50% already there: 1.5 x 2 = 3, so +200%.
    expect(after.extraGold).toBeCloseTo(2);
    expect(after.extraExp).toBeCloseTo(1);
    // Boss damage: the Black Orb's 20% times the event's 50%.
    expect(after.bossDamage).toBeCloseTo(1.2 * 1.5 - 1);
    expect(after.monsterDamage).toBeCloseTo(0.3);
    // HP Recovery and crit don't move.
    expect(after.hpRecovery).toBeCloseTo(before.hpRecovery);
    expect(after.critDamage).toBe(before.critDamage);
  });

  it("scales base ATK and HP by soul gem stats, but not the soul weapon's own ATK", () => {
    const s = sample();
    s.soulWeapon.atk = 1;
    const before = computeStats(s);
    s.engraving.atk = 1;
    s.engraving.hp = 0.5;
    const after = computeStats(s);
    expect(after.attack / before.attack).toBeCloseTo(3 / 2);
    expect(after.hp / before.hp).toBeCloseTo(1.5);
  });

  it("adds gear secondary stats to CRIT DMG, gold, EXP and mana", () => {
    const s = emptySources();
    s.gearSecondary = { critDamage: 0.555, gold: 0.25, exp: 0.05, mana: 0.02, manaRecovery: 0.05 };
    const stats = computeStats(s);
    expect(stats.critDamage).toBeCloseTo(1.55);
    expect(stats.extraGold).toBeCloseTo(0.25);
    expect(stats.extraExp).toBeCloseTo(0.05);
    expect(stats.mana).toBeCloseTo(102);
    expect(stats.manaRecovery).toBeCloseTo(10.5);
  });

  it("adds skill buffs only through the skills source", () => {
    const s = sample();
    const base = computeStats(s).attack;
    s.skills.atk = 0.5;
    expect(computeStats(s).attack).toBeCloseTo(base * 1.5);
  });
});
