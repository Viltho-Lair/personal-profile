import companionData from "@/data/companions.json";

export type CompanionSkill = {
  name: string;
  effect: string;
  maxLevel: number;
  icon: string | null;
};

export type Companion = {
  id: number;
  name: string;
  className: string;
  element: string | null;
  specialty: string | null;
  /** 128 px square, cropped from the first idle frame of the sprite sheet. */
  portrait: string | null;
  skills: CompanionSkill[];
  /** Later skills the wiki names but has no icon or effect text for. */
  lockedSkills: { name: string; maxLevel: number }[];
  passive: {
    name: string | null;
    maxLevel: number | null;
    /** Stones and emeralds for the full climb to max level. */
    stoneCost: number | null;
    emeraldCost: number | null;
  };
  promotionSlots: number;
};

export type PromotionOption = {
  name: string;
  percent: boolean;
  /** One value per roll tier, lowest first. */
  values: number[];
};

export type Promotion = {
  tiers: { color: string; rarity: string; probability: number }[];
  options: PromotionOption[];
  pages: { page: number; multiplier: number }[];
  maxRollDice: number | null;
};

export const COMPANIONS = companionData.companions as unknown as Companion[];
export const PROMOTION = companionData.promotion as unknown as Promotion;
export const COMPANION_SOURCE = companionData.source;

/**
 * Skill levels share one store, so each skill needs an id that is unique
 * across companions: companion 2, skill 3 is 23. The passive takes slot 0.
 */
export function skillKey(companion: Companion, index: number): number {
  return companion.id * 10 + index + 1;
}

export function passiveKey(companion: Companion): number {
  return companion.id * 10;
}
