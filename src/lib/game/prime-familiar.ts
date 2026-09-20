/**
 * The prime familiar: the one creature the three equipped familiars show up as
 * in game. The battle familiar is its body, the attribute familiar colours it
 * and sets its element, and the weapon familiar puts a weapon in its hand.
 *
 * The bodies are the familiars' own art, banded by stars in familiars.json. The
 * weapon layer is one sprite per weapon, element and tier, mirrored by
 * scripts/fetch-wiki-prime-familiar-weapons.py; its tier follows the weapon
 * familiar's art band, so body and weapon step up together.
 */

/** Star bands, as the art in familiars.json is banded: 0-5, 6-7, 8-9, 10, 11. */
export const STAR_BANDS = [0, 6, 8, 10, 11] as const;

/** The weapon each weapon familiar brings, as its sprites are named. */
export const FAMILIAR_WEAPONS: Record<string, string> = {
  Na: "spear",
  Rion: "sword",
  Ru: "scythe",
  Mus: "wand",
};

/** The elements with weapon art, in the sprite names. */
export const WEAPON_ELEMENTS = ["fire", "water", "wind", "earth"] as const;

export type PrimePart = { name: string; stars: number };

export type PrimeFamiliar = {
  /** The battle familiar's art at its stars: the prime's body. */
  body: string | null;
  /** The weapon familiar's weapon in the attribute familiar's element. */
  weapon: string | null;
  /** The element the attribute familiar gives it, lower case as the art is named. */
  element: string | null;
  /** 1-4, from the weapon familiar's stars: which weapon art it holds. */
  tier: number;
};

/** Which art band a star count falls in: 0 for 0-5 stars through 4 for 11. */
export function starBand(stars: number): number {
  const band = STAR_BANDS.filter((from) => stars >= from).length - 1;
  return Math.max(0, band);
}

/**
 * The weapon's tier, 1-4, from its familiar's stars. The art has four tiers
 * against five star bands, so 10 and 11 stars share the last one.
 */
export function weaponTier(stars: number): number {
  return Math.min(4, starBand(stars) + 1);
}

/** Where a weapon sprite lives, or null when the pieces don't name one. */
export function weaponArt(weapon: string | null, element: string | null, stars: number): string | null {
  const slug = weapon ? FAMILIAR_WEAPONS[weapon] : undefined;
  const lower = element?.toLowerCase() ?? null;
  if (!slug || !lower || !(WEAPON_ELEMENTS as readonly string[]).includes(lower)) return null;
  return `/art/familiars/prime/${slug}-${lower}-${weaponTier(stars)}.png`;
}

/**
 * The prime the three familiars make. `bodyArt` resolves a familiar's own art
 * at a star count, which only the component layer knows how to look up.
 */
export function primeFamiliar(
  parts: {
    attribute: (PrimePart & { element: string | null }) | null;
    battle: PrimePart | null;
    weapon: PrimePart | null;
  },
  bodyArt: (name: string, stars: number) => string | null,
): PrimeFamiliar | null {
  const { attribute, battle, weapon } = parts;
  if (!attribute || !battle || !weapon) return null;
  const element = attribute.element?.toLowerCase() ?? null;
  return {
    body: bodyArt(battle.name, battle.stars),
    weapon: weaponArt(weapon.name, element, weapon.stars),
    element,
    tier: weaponTier(weapon.stars),
  };
}
