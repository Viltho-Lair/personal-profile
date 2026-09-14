/**
 * What upgrades cost, as the Master Optimizer works it out. Every "from -> to" is the sum of each level's cost
 * from `from` up to `to - 1`.
 *
 * - Gold enhance: ATK, HP and HP Recovery cost J·L⁴/1e8 + L³/1e4 + L(L−1)/2 a level, J by level band (×1.00001
 *   a level past 1,000,000, measured to the target); CRIT DMG (L⁴/1e4 + 10L² + 10L)/20; Death Strike damage
 *   L⁵/2000 + 98L³; Death Strike chance L⁴; CRIT chance from its table.
 * - Cubes: weapons and accessories floor(grade factor × Orr[L+1] / 10000), classes the same with the class
 *   grade's factor; spirits 30·(L+1)³ cubes and their crystal table.
 * - Companion passives: Stone and Emerald by level (level 99's cost for every level past 100).
 * - Relics: the expected cost of each attempt (5000/11) over its success rate.
 */

export type CostTables = {
  gold: { critChance: number[]; bands: { from: number; multiple: number }[] };
  cubes: { orr: number[]; weaponFactors: Record<string, number>; classFactors: number[] };
  spiritCrystals: number[];
  companionPassives: Record<string, Record<string, { stone: number[]; emerald: number[] }>>;
};

/** Σk, Σk², Σk³ and Σk⁴ for k = 1..n. */
const s1 = (n: number) => (n * (n + 1)) / 2;
const s2 = (n: number) => (n * (n + 1) * (2 * n + 1)) / 6;
const s3 = (n: number) => s1(n) ** 2;
const s4 = (n: number) => (n * (n + 1) * (2 * n + 1) * (3 * n * n + 3 * n - 1)) / 30;
const s5 = (n: number) => (n * n * (n + 1) ** 2 * (2 * n * n + 2 * n - 1)) / 12;
/** Σ over L = from..to-1 of a sum function. */
const range = (sum: (n: number) => number, from: number, to: number) => (to > from ? sum(to - 1) - sum(Math.max(0, from - 1)) : 0);

const MILLION = 1_000_000;
const PAST_MILLION_BAND = 5000;
const PAST_MILLION_RATE = 1.00001;

/** Gold for ATK, HP or HP Recovery from one level to another. */
export function statGold(tables: CostTables, from: number, to: number): number {
  if (to <= from) return 0;
  // J·L⁴/1e8 + L³/1e4 + L(L−1)/2, the J part per band.
  const flat = range(s3, from, to) / 1e4 + (range(s2, from, to) - range(s1, from, to)) / 2;
  let quartic = 0;
  const { bands } = tables.gold;
  for (let i = 0; i < bands.length; i += 1) {
    const start = Math.max(from, bands[i]!.from);
    const end = Math.min(to, bands[i + 1]?.from ?? MILLION);
    if (end > start) quartic += bands[i]!.multiple * range(s4, start, end);
  }
  // Past a million, each 5,000-level band multiplies J by 1.00001 a level, counted up to the target level.
  const last = bands[bands.length - 1]?.multiple ?? 1;
  for (let band = 1, start = MILLION; start < to; band += 1, start += PAST_MILLION_BAND) {
    const lo = Math.max(from, start);
    const hi = Math.min(to, start + PAST_MILLION_BAND);
    if (hi <= lo) continue;
    quartic += last * PAST_MILLION_RATE ** Math.min(to - MILLION, PAST_MILLION_BAND * band) * range(s4, lo, hi);
  }
  return quartic / 1e8 + flat;
}

/** Gold for CRIT DMG levels. */
export const critDamageGold = (from: number, to: number) => (range(s4, from, to) / 1e4 + 10 * range(s2, from, to) + 10 * range(s1, from, to)) / 20;
/** Gold for Death Strike damage levels. */
export const deathStrikeGold = (from: number, to: number) => range(s5, from, to) / 2000 + 98 * range(s3, from, to);
/** Gold for Death Strike chance levels. */
export const deathStrikeChanceGold = (from: number, to: number) => range(s4, from, to);

/** Sums a per-level table over from..to-1 (levels past its end cost what its last level costs). */
function tableSum(table: readonly number[], from: number, to: number) {
  let total = 0;
  for (let level = from; level < to; level += 1) total += table[Math.min(level, table.length - 1)] ?? 0;
  return total;
}

/** Gold for CRIT chance levels. */
export const critChanceGold = (tables: CostTables, from: number, to: number) => tableSum(tables.gold.critChance, from, to);

/** Cubes to level a weapon or accessory of this grade. */
export function gearCubes(tables: CostTables, grade: string, from: number, to: number): number {
  const factor = tables.cubes.weaponFactors[grade] ?? 0;
  let total = 0;
  for (let level = from; level < to; level += 1) total += Math.floor((factor * (tables.cubes.orr[level + 1] ?? 0)) / 10000);
  return total;
}

/** Cubes to level a class of this grade (1 for Trainee, 2 for Adventurer, ...). */
export function classCubes(tables: CostTables, grade: number, from: number, to: number): number {
  const factor = tables.cubes.classFactors[grade - 1] ?? 0;
  let total = 0;
  for (let level = from; level < to; level += 1) total += Math.floor((factor * (tables.cubes.orr[level + 1] ?? 0)) / 10000);
  return total;
}

/** Cubes and Mana Crystals to level a spirit. */
export function spiritCost(tables: CostTables, from: number, to: number): { cubes: number; crystals: number } {
  return { cubes: 30 * (to > from ? s3(to) - s3(from) : 0), crystals: tableSum(tables.spiritCrystals, from, to) };
}

/** Stones and Emeralds to level a companion's passive. */
export function passiveCost(tables: CostTables, companion: string, passive: string, from: number, to: number): { stones: number; emeralds: number } | null {
  const table = tables.companionPassives[companion]?.[passive];
  if (!table) return null;
  return { stones: tableSum(table.stone, from, to), emeralds: tableSum(table.emerald, from, to) };
}

/** A relic attempt's success chance at a level: 100% at 0, then 99.4% down 1.7% a level, 10% from level 54. */
export const relicSuccessRate = (level: number) => (level <= 0 ? 1 : level >= 54 ? 0.1 : (99.4 - 1.7 * (level - 1)) / 100);

/** The expected cost of relic levels: each level's attempt cost (5000/11) over its success chance. */
export function relicCost(from: number, to: number): number {
  let total = 0;
  for (let level = from; level < to; level += 1) total += 5000 / 11 / relicSuccessRate(level);
  return total;
}
