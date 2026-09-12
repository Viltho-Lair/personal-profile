/** Tailwind classes per rarity tier, so tiles and labels read like the game. */
export const TIER_TEXT: Record<string, string> = {
  Common: "text-tier-common",
  Great: "text-tier-great",
  Rare: "text-tier-rare",
  Epic: "text-tier-epic",
  Legendary: "text-tier-legendary",
  Mythic: "text-tier-mythic",
  Immortal: "text-tier-immortal",
};

export const TIER_BORDER: Record<string, string> = {
  Common: "border-tier-common/50",
  Great: "border-tier-great/50",
  Rare: "border-tier-rare/50",
  Epic: "border-tier-epic/50",
  Legendary: "border-tier-legendary/50",
  Mythic: "border-tier-mythic/50",
  Immortal: "border-tier-immortal/50",
};

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
