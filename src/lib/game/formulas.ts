/** A relic level band: `factor` applies from `from` to `to` (null = no end). */
export type Band = { from: number; to: number | null; factor: number };

/** Owned effect is this share of the equip effect (Equipment Data F149 vs E149). */
export const OWNED_SHARE = 0.3;

/**
 * Skill power % at a level, as the wiki's skill card computes it. The game's
 * displayed number also folds in account bonuses, which are out of scope.
 */
export function skillPower(baseValue: number, upgradeValue: number, level: number): number | null {
  if (level < 1) return null;
  return baseValue + upgradeValue * (Math.floor(level) - 1);
}

/** Equip effect % = grade multiplier x factor for the enhance level. */
export function gearEffects(
  multiplier: number,
  factors: readonly number[],
  level: number,
): { equip: number; owned: number } {
  const index = Math.min(Math.max(Math.floor(level), 0), factors.length - 1);
  const equip = multiplier * factors[index];
  return { equip, owned: equip * OWNED_SHARE };
}

export function bandAt(bands: readonly Band[], level: number): Band | null {
  return bands.find((band) => level >= band.from && (band.to === null || level <= band.to)) ?? null;
}

/**
 * Relic buff at a level: level x the band's factor. Percentage relics are
 * shown as a percent (x 100); flat relics such as Focus Ring are not.
 */
export function relicBuff(bands: readonly Band[], level: number, percent: boolean): number | null {
  const band = bandAt(bands, level);
  if (band === null) return null;
  const value = level * band.factor;
  return percent ? value * 100 : value;
}
