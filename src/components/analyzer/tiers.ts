/** Awakenings (stars) at which Immortal weapons and accessories become Ancient, then the unnamed dark blue tier. */
export const ANCIENT_AWAKENING = 24;
export const STAR_30_AWAKENING = 30;

/** The game has no name for the tier above Ancient, so it goes by its stars. */
export const STAR_30_TIER = "30★";

/** Tailwind classes per rarity tier, so tiles and labels read like the game. */
export const TIER_TEXT: Record<string, string> = {
  Common: "text-tier-common",
  Great: "text-tier-great",
  Rare: "text-tier-rare",
  Epic: "text-tier-epic",
  Legendary: "text-tier-legendary",
  Mythic: "text-tier-mythic",
  Immortal: "text-tier-immortal",
  Ancient: "text-tier-ancient",
  [STAR_30_TIER]: "text-tier-star30",
};

/** Full-strength tier borders; the element sets the width (3px on tiles), so the colour reads. */
export const TIER_BORDER: Record<string, string> = {
  Common: "border-tier-common",
  Great: "border-tier-great",
  Rare: "border-tier-rare",
  Epic: "border-tier-epic",
  Legendary: "border-tier-legendary",
  Mythic: "border-tier-mythic",
  Immortal: "border-tier-immortal",
  Ancient: "border-tier-ancient",
  [STAR_30_TIER]: "border-tier-star30",
};

/** The rarity an Immortal weapon or accessory shows at its awakening: Ancient at 24 stars, 30★ at 30. */
export function gearRarity(tier: string, awakening: number): string {
  if (tier !== "Immortal") return tier;
  if (awakening >= STAR_30_AWAKENING) return STAR_30_TIER;
  if (awakening >= ANCIENT_AWAKENING) return "Ancient";
  return tier;
}

export const ELEMENT_TEXT: Record<string, string> = {
  Fire: "text-element-fire",
  Water: "text-element-water",
  Wind: "text-element-wind",
  Earth: "text-element-earth",
};

export const ELEMENT_BORDER: Record<string, string> = {
  Fire: "border-element-fire/50",
  Water: "border-element-water/50",
  Wind: "border-element-wind/50",
  Earth: "border-element-earth/50",
};
