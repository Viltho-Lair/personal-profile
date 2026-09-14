import { formatNumber } from "@/lib/number-format";

export type CompanionFormula =
  | { kind: "linear"; perLevel: number; display: EffectDisplay }
  | { kind: "understanding"; display: EffectDisplay };

/** percent: a fraction shown x100; percentLiteral: already a percent; flat: a plain number. */
export type EffectDisplay = "percent" | "percentLiteral" | "flat";

/** [stones, emeralds] to go from level L to L + 1; the index is L. */
export type CostTable = readonly (readonly [number, number])[];

/**
 * A passive skill's effect at a level, as COMPANIONS computes it. The
 * "Understanding" skills (max 1500) grow in steps: +1 per level up to 10,
 * then each level adds (tens + 1), and past 500 each level adds 50.
 */
export function companionEffect(formula: CompanionFormula, level: number): number {
  const l = Math.max(0, Math.floor(level));
  if (formula.kind === "linear") return formula.perLevel * l;
  let raw: number;
  if (l <= 10) raw = l;
  else if (l > 500) raw = 12_750 + (l - 500) * 50;
  else {
    const step = Math.floor(l / 10) + 1;
    raw = (10 * (step - 1) * step) / 2 + (l % 10) * step;
  }
  return raw / 100;
}

export function formatEffect(display: EffectDisplay, value: number): string {
  const n = (x: number) => formatNumber(x, 2);
  if (display === "percent") return `+${n(value * 100)}%`;
  if (display === "percentLiteral") return `+${n(value)}%`;
  return `+${n(value)}`;
}

/**
 * Cost of one level. The tables list levels 0-99; the 1500-level skills
 * cost the same as level 99 for every level past it.
 */
function levelCost(costs: CostTable, level: number): readonly [number, number] {
  return costs[Math.min(level, costs.length - 1)] ?? [0, 0];
}

export function nextLevelCost(costs: CostTable, level: number, maxLevel: number): [number, number] | null {
  if (level >= maxLevel) return null;
  const [stones, emeralds] = levelCost(costs, level);
  return [stones, emeralds];
}

export function costToMax(costs: CostTable, level: number, maxLevel: number): [number, number] {
  let stones = 0;
  let emeralds = 0;
  for (let l = Math.max(0, level); l < maxLevel; l += 1) {
    const [s, e] = levelCost(costs, l);
    stones += s;
    emeralds += e;
  }
  return [stones, emeralds];
}

/** Companion level from the sum of its passive levels: 1 per 5 levels, 1 per 10 past 300. */
export function companionLevel(totalPassiveLevels: number): number {
  const total = Math.max(0, Math.floor(totalPassiveLevels));
  return total > 300 ? 60 + Math.floor((total - 300) / 10) : Math.floor(total / 5);
}

/**
 * A companion's Status: element damage for its element, the increment of its
 * promotion # (advancement + 1, Companions Data U7:V55) per companion level.
 */
export function companionStatus(increments: number[], advancement: number, level: number): number {
  const index = Math.min(increments.length - 1, Math.max(0, Math.floor(advancement)));
  return (increments[index] ?? 0) * Math.max(0, level);
}

/** A promotion rank ("3rd") multiplies its rolled value; `null` means the slot is still locked. */
export function promotionBuff(value: number | null, rank: string | null, multipliers: Record<string, number>): number {
  if (value === null || rank === null) return 0;
  return value * (multipliers[rank] ?? 0);
}
