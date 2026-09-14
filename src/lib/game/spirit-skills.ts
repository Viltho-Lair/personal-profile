/**
 * Spirit skills of the accompanying spirits, at each spirit's skill level (1-5).
 * They're on whenever the spirit accompanies: HP for the stats, the rest for the fight.
 */

export type SpiritSkillData = {
  name: string | null;
  levels: { level: number; effect: string }[];
};

export type SpiritSkillEffects = {
  /** Damage x `multiplier` for the last `seconds` of the battle (Noah's Last Fight). */
  lastFight: { multiplier: number; seconds: number } | null;
  /** Every `every` seconds from the start, damage equal to `share` of the enemy's remaining HP (Sala's Breath of Fire). */
  breath: { every: number; share: number } | null;
  /** Skill damage against boss monsters (Loar's Wilderness Roar) and normal monsters (Mum's Reign), as fractions. */
  bossSkillDamage: number;
  monsterSkillDamage: number;
  /** Normal monsters below this share of their HP die at once (Zappy's Judge's Torpedo). */
  execute: number;
  /** The first hit on a normal monster takes this share of its HP (Kart's Thief Wind). */
  firstStrike: number;
  /** Damage dealt while the enemy's HP is above 70% (Radon's Leveling), as a fraction. */
  highHpDamage: number;
  /** Every `every` seconds, skill cooldowns recover `share` of their length (Herh's Wind Force). */
  cooldownRecovery: { every: number; share: number } | null;
  /** Time stops for `seconds`, `at` seconds into the battle, once (Ark's Time Freeze). */
  timeStop: { at: number; seconds: number } | null;
  /** Total HP increase (Bo's Wild Heart), as a fraction. */
  hp: number;
  /** Chance of double gold and EXP when gained (Todd, Luga): drops, not stats. */
  goldDouble: number;
  expDouble: number;
  /** "Skill Lv" for every skill counted, and the skills whose level has no known value. */
  active: string[];
  unknown: string[];
};

export const HIGH_HP_THRESHOLD = 0.7;
const ROMAN = ["", "I", "II", "III", "IV", "V"];

export const noSpiritSkills = (): SpiritSkillEffects => ({
  lastFight: null,
  breath: null,
  bossSkillDamage: 0,
  monsterSkillDamage: 0,
  execute: 0,
  firstStrike: 0,
  highHpDamage: 0,
  cooldownRecovery: null,
  timeStop: null,
  hp: 0,
  goldDouble: 0,
  expDouble: 0,
  active: [],
  unknown: [],
});

/** The first number in a level's effect text ("80% boss damage" -> 80), or null when it's unknown. */
function levelValue(skill: SpiritSkillData, level: number): number | null {
  const match = skill.levels.find((l) => l.level === level)?.effect.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

/** The partner (the spirit preset's first slot) has its skill 10% stronger. */
export const PARTNER_BONUS = 1.1;
/** How the partner's stronger skill reads: "Partner · skill +10%". */
export const PARTNER_LABEL = `Partner · skill +${Math.round((PARTNER_BONUS - 1) * 100)}%`;

/** Adds up the skills of the given spirits: each with its skill data and skill level, and whether it's the partner. */
export function spiritSkillEffects(spirits: { spirit: string; skill: SpiritSkillData; level: number; partner?: boolean }[]): SpiritSkillEffects {
  const effects = noSpiritSkills();
  for (const { spirit, skill, level: rawLevel, partner } of spirits) {
    if (!skill.name) continue;
    const level = Math.min(5, Math.max(1, Math.round(rawLevel)));
    const label = `${skill.name} ${ROMAN[level]} (${spirit})${partner ? " · partner" : ""}`;
    const base = levelValue(skill, level);
    if (base === null) {
      effects.unknown.push(label);
      continue;
    }
    // Time Freeze's seconds stay as they are; every other effect grows with the partner bonus.
    const value = partner && skill.name !== "Time Freeze" ? base * PARTNER_BONUS : base;
    const share = value / 100;
    switch (skill.name) {
      case "Last Fight":
        effects.lastFight = { multiplier: Math.max(effects.lastFight?.multiplier ?? 1, value), seconds: 5 };
        break;
      case "Breath of Fire":
        effects.breath = { every: 12, share: Math.max(effects.breath?.share ?? 0, share) };
        break;
      case "Wilderness Roar":
        effects.bossSkillDamage += share;
        break;
      case "Reign":
        effects.monsterSkillDamage += share;
        break;
      case "Judge's Torpedo":
        effects.execute = Math.max(effects.execute, share);
        break;
      case "Thief Wind":
        effects.firstStrike = Math.max(effects.firstStrike, share);
        break;
      case "Leveling":
        effects.highHpDamage += share;
        break;
      case "Wind Force":
        effects.cooldownRecovery = { every: 10, share: (effects.cooldownRecovery?.share ?? 0) + share };
        break;
      case "Time Freeze":
        effects.timeStop = { at: 8, seconds: Math.max(effects.timeStop?.seconds ?? 0, value) };
        break;
      case "Wild Heart":
        effects.hp += share;
        break;
      case "Gold Rumble":
        effects.goldDouble = Math.max(effects.goldDouble, share);
        break;
      case "Understanding of the Abyss":
        effects.expDouble = Math.max(effects.expDouble, share);
        break;
      default:
        effects.unknown.push(label);
        continue;
    }
    effects.active.push(label);
  }
  return effects;
}
