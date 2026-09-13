/**
 * Familiar Proficiency bonuses (fractions), as Familiar Data T72:X77 adds them:
 * every proficiency gives ATK (level / 100) and HP (level / 10); Attribute also
 * gives All Attribute DMG (level), Weapon gives Slayer DMG and Battle gives
 * Familiar DMG (level / 100).
 */
export function proficiencyBonuses(levels: { attribute: number; weapon: number; battle: number }) {
  const total = levels.attribute + levels.weapon + levels.battle;
  return {
    atk: total / 100,
    hp: total / 10,
    allAttributeDamage: levels.attribute,
    slayerDamage: levels.weapon / 100,
    familiarDamage: levels.battle / 100,
  };
}

export type AltarLevel = { level: number; skillDamage: number; soul: number; starsNeeded: number };

/** Only the six highest-starred familiars count toward the Mana Altar. */
export const ALTAR_FAMILIARS = 6;

export function altarStars(stars: readonly number[]): number {
  return [...stars]
    .sort((a, b) => b - a)
    .slice(0, ALTAR_FAMILIARS)
    .reduce((sum, s) => sum + s, 0);
}

/**
 * Mana Altar bonuses for a star total: every altar level whose star
 * requirement is met adds its skill damage and soul marble, in hundredths.
 */
export function manaAltar(totalStars: number, levels: readonly AltarLevel[]) {
  const reached = levels.filter((level) => totalStars >= level.starsNeeded);
  return {
    level: reached.length,
    skillDamage: reached.reduce((sum, level) => sum + level.skillDamage, 0) / 100,
    soul: reached.reduce((sum, level) => sum + level.soul, 0) / 100,
    nextStars: levels[reached.length]?.starsNeeded ?? null,
  };
}
