/** Growing Knowledge grade row: its ATK effect, Death Strike cap and the Superhuman bonus at that grade. */
export type KnowledgeGrade = { grade: string; atk: number; maxDeathStrike: number | null; superhuman: number };

export type EnhanceFormula =
  | { kind: "tiered"; tiers: { from: number; multiplier: number }[]; scale: number }
  | { kind: "percent"; perLevel: number };

export type EnhanceStat = {
  name: string;
  maxLevel: number | null;
  requiresCrit?: number;
  cap?: "growingKnowledge" | number;
  formula: EnhanceFormula;
};

/**
 * An enhance stat at a level. ATK, HP and HP Recovery are level x the
 * multiplier of the highest tier reached (x1 from 0, x2 from 100 ... x6 from
 * 1,000,000), HP also x10. The crit stats are a fraction per level.
 */
export function enhanceStat(formula: EnhanceFormula, level: number): { value: number; perLevel: number } {
  const l = Math.max(0, Math.floor(level));
  if (formula.kind === "percent") return { value: l * formula.perLevel, perLevel: formula.perLevel };
  const tier = [...formula.tiers].reverse().find((t) => l >= t.from) ?? formula.tiers[0];
  const perLevel = (tier?.multiplier ?? 1) * formula.scale;
  return { value: l * perLevel, perLevel };
}

/**
 * An enhance stat's max level. Death Strike and Death Strike % stay at 1
 * until CRIT % reaches its requirement; then Death Strike's cap is the
 * Growing Knowledge grade's cap plus the Superhuman grade's bonus.
 */
export function enhanceMax(
  stat: EnhanceStat,
  critLevel: number,
  knowledge: KnowledgeGrade | undefined,
  superhuman: KnowledgeGrade | undefined,
): number {
  if (stat.maxLevel !== null) return stat.maxLevel;
  if (stat.requiresCrit !== undefined && critLevel < stat.requiresCrit) return 1;
  if (stat.cap === "growingKnowledge") return (knowledge?.maxDeathStrike ?? 1) + (superhuman?.superhuman ?? 0);
  return typeof stat.cap === "number" ? stat.cap : 1;
}

export type LatentMultiplier = { grade: number; level: number; multiplier: number };

/** Awakened Latent Power multiplier for a grade (1+) and level; grade 0 means not awakened. */
export function latentMultiplier(table: readonly LatentMultiplier[], grade: number, level: number): number {
  if (grade < 1) return 1;
  return table.find((row) => row.grade === grade && row.level === level)?.multiplier ?? 1;
}

/**
 * Per-level growth value after Latent Power (CHARACTER AI25:AI29): the base
 * value grows with the slayer's level above 250 and the sum of that stat's
 * latent slots. STR and VIT add; HP, CRI and LUK scale.
 */
export function latentPerLevel(stat: string, base: number, slayerLevel: number, latentSum: number): number {
  const above = slayerLevel - 250;
  switch (stat) {
    case "STR":
    case "VIT":
      return base + (above * latentSum) / 200;
    case "HP":
      return base * (1 + (above / 1000) * latentSum);
    case "CRI":
      return base * (1 + (above / 10000) * latentSum);
    case "LUK":
      return base * (1 + (above / 20000) * latentSum);
    default:
      return base;
  }
}

/** Slayer level the first Training Diary level unlocks at; each further level needs 100 more. */
export const DIARY_FIRST_LEVEL = 500;
export const DIARY_LEVEL_STEP = 100;

/** Highest Training Diary level the slayer's level allows: level 1 at 500, level 24 at 2,800. */
export function diaryMaxLevel(slayerLevel: number): number {
  if (slayerLevel < DIARY_FIRST_LEVEL) return 0;
  return Math.floor((slayerLevel - DIARY_FIRST_LEVEL) / DIARY_LEVEL_STEP) + 1;
}

/** Slayer level a Training Diary level unlocks at. */
export const diaryUnlockLevel = (diaryLevel: number) => DIARY_FIRST_LEVEL + (diaryLevel - 1) * DIARY_LEVEL_STEP;

/** Skill points the slayer starts with. */
export const STARTING_SKILL_POINTS = 100;

/**
 * Growth skill points: 100 to start, 3 per level-up (level 1 gives none), and
 * 100 per Training Diary level the slayer's level has unlocked. At slayer level
 * 2,800 with diary 24 that's 8,397 + 100 + 2,400 = 10,897, as in the game.
 */
export function skillPoints(slayerLevel: number, diaryLevel: number) {
  const level = Math.max(0, Math.floor(slayerLevel));
  const diary = Math.min(Math.max(0, Math.floor(diaryLevel)), diaryMaxLevel(level));
  const fromLevel = Math.max(0, level - 1) * 3;
  const fromDiary = diary * 100;
  return { starting: STARTING_SKILL_POINTS, fromLevel, fromDiary, diary, total: STARTING_SKILL_POINTS + fromLevel + fromDiary };
}

/**
 * Growth max levels. STR, HP, VIT and LUK start at 1,000 and gain 50 per Training
 * Diary level; CRI, ACC and DODGE start at 200 and gain 10. Over Points (20 per
 * diary level) buy up to 48 more steps per stat: +25 max level for 5 OP, or +5
 * for 1 OP.
 */
export const GROWTH_CAP = {
  large: { base: 1000, perDiary: 50, perUpgrade: 25, upgradeCost: 5 },
  small: { base: 200, perDiary: 10, perUpgrade: 5, upgradeCost: 1 },
} as const;
export const LARGE_GROWTH = ["STR", "HP", "VIT", "LUK"] as const;
export const OP_PER_DIARY_LEVEL = 20;
export const MAX_DIARY_UPGRADES = 48;

export const growthCapOf = (stat: string) => ((LARGE_GROWTH as readonly string[]).includes(stat) ? GROWTH_CAP.large : GROWTH_CAP.small);

/** A growth stat's max level from the Training Diary level and its Over Point upgrades. */
export function growthMaxLevel(stat: string, diaryLevel: number, upgrades: number): number {
  const cap = growthCapOf(stat);
  const steps = Math.min(MAX_DIARY_UPGRADES, Math.max(0, Math.floor(upgrades)));
  return cap.base + Math.max(0, Math.floor(diaryLevel)) * cap.perDiary + steps * cap.perUpgrade;
}

/** Over Points earned from the Training Diary and spent on max-level upgrades. */
export function overPoints(diaryLevel: number, upgrades: Record<string, number>) {
  const total = Math.max(0, Math.floor(diaryLevel)) * OP_PER_DIARY_LEVEL;
  const spent = Object.entries(upgrades).reduce(
    (sum, [stat, count]) => sum + Math.min(MAX_DIARY_UPGRADES, Math.max(0, Math.floor(count))) * growthCapOf(stat).upgradeCost,
    0,
  );
  return { total, spent, left: total - spent };
}

/** Class max level: 200, +50 per Awakened Blast. */
export function classMaxLevel(awakening: number): number {
  return 200 + 50 * Math.max(0, Math.floor(awakening));
}

/** The last class changes with Awakened Blast: Blast, Tera (6+), Seed (12+), Nova (18). */
export function awakenedClassName(awakening: number): string {
  if (awakening >= 18) return "Nova";
  if (awakening >= 12) return "Seed";
  if (awakening >= 6) return "Tera";
  return "Blast";
}

/** A promotion additional ability row is open once the promotion passes its position (row 1 needs promotion 2). */
export function abilityRowOpen(promotion: number, row: number): boolean {
  return promotion > row;
}
