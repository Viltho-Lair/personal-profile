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

/** Growth skill points: 3 per slayer level, plus 100 per Training Diary level the slayer's level has unlocked. */
export function skillPoints(slayerLevel: number, diaryLevel: number) {
  const level = Math.max(0, Math.floor(slayerLevel));
  const diary = Math.min(Math.max(0, Math.floor(diaryLevel)), diaryMaxLevel(level));
  return { fromLevel: level * 3, fromDiary: diary * 100, diary, total: level * 3 + diary * 100 };
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
