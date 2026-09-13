import { noElements, type ByElement } from "./stats";

/** One statue's level table (Equipment Data): a row of stat fractions per level, level 1 first. */
export type ShrineStatue = { key: ShrineKey; name: string; stats: string[]; levels: number[][]; icon: string | null; iconSize: number | null };
export type ShrineData = { statues: ShrineStatue[] };

export const SHRINE_KEYS = ["dragon", "order", "chaos", "demon"] as const;
export type ShrineKey = (typeof SHRINE_KEYS)[number];
export type ShrineLevels = Record<ShrineKey, number>;

export const emptyShrineLevels = (): ShrineLevels => ({ dragon: 0, order: 0, chaos: 0, demon: 0 });

/** The stat fractions of a statue at a level; level 0 (not unlocked) gives zeros. */
export function statueValues(statue: ShrineStatue | undefined, level: number): number[] {
  if (!statue) return [];
  const row = statue.levels[Math.min(level, statue.levels.length) - 1];
  return row ?? statue.stats.map(() => 0);
}

export type ShrineEffects = {
  /** Latent power growth amps for STR, HP, VIT, CRI and LUK (DMG Efficiency Data H150:H154). */
  latent: Record<"STR" | "HP" | "VIT" | "CRI" | "LUK", number>;
  /** Statue of Order: extra damage by element. */
  element: ByElement;
  /** Statue of Chaos: soul weapon ATK amp (B11) and Character ATK% (D44). */
  soulWeaponAtk: number;
  atk: number;
  /** Statue of Demon: Character HP% (D47) and skill damage amp. */
  hp: number;
  skillDamage: number;
};

export function shrineEffects(data: ShrineData, levels: ShrineLevels): ShrineEffects {
  const values = (key: ShrineKey) => statueValues(data.statues.find((s) => s.key === key), levels[key]);
  const [str = 0, hp = 0, vit = 0, cri = 0, luk = 0] = values("dragon");
  const [fire = 0, water = 0, wind = 0, earth = 0] = values("order");
  const [soulWeaponAtk = 0, atk = 0] = values("chaos");
  const [characterHp = 0, skillDamage = 0] = values("demon");
  return {
    latent: { STR: str, HP: hp, VIT: vit, CRI: cri, LUK: luk },
    element: { ...noElements(), Fire: fire, Water: water, Wind: wind, Earth: earth },
    soulWeaponAtk,
    atk,
    hp: characterHp,
    skillDamage,
  };
}
