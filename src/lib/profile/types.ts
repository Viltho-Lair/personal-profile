/** Weapons and accessories are graded, and keyed by grade name ("Common 4"). */
export type GearKind = "weapons" | "accessories";
export type OwnableKind = GearKind | "spirits" | "soulWeapons";
export type EquippableKind = GearKind | "soulWeapons";

export type GearState = { owned: boolean; level: number };

export const SKILL_PRESET_COUNT = 5;
export const SKILL_PRESET_SLOTS = 10;

/** Skill names per slot, filled top row left to right, then the bottom row. */
export type SkillPreset = (string | null)[];

/**
 * A player's account as entered in the analyzer. Stored sparsely: only items
 * the player has changed appear, everything else reads as the default.
 */
export type ProfileV1 = {
  version: 1;
  skills: Record<string, { level: number }>;
  weapons: Record<string, GearState>;
  accessories: Record<string, GearState>;
  equippedWeapon: string | null;
  equippedAccessory: string | null;
  relics: Record<string, { level: number }>;
  spirits: Record<string, { owned: boolean; level: number }>;
  soulWeapons: Record<string, { owned: boolean }>;
  equippedSoulWeapon: string | null;
  proficiencyLevel: number;
  /** While on, every skill counts as its max level; typed levels are kept. */
  skillsAtMax: boolean;
  skillPresets: SkillPreset[];
  activeSkillPreset: number;
};

export type KnownNames = Record<
  "skills" | "weapons" | "accessories" | "relics" | "spirits" | "soulWeapons",
  string[]
>;

export function emptySkillPresets(): SkillPreset[] {
  return Array.from({ length: SKILL_PRESET_COUNT }, () =>
    Array<string | null>(SKILL_PRESET_SLOTS).fill(null),
  );
}

export function emptyProfile(): ProfileV1 {
  return {
    version: 1,
    skills: {},
    weapons: {},
    accessories: {},
    equippedWeapon: null,
    equippedAccessory: null,
    relics: {},
    spirits: {},
    soulWeapons: {},
    equippedSoulWeapon: null,
    proficiencyLevel: 0,
    skillsAtMax: false,
    skillPresets: emptySkillPresets(),
    activeSkillPreset: 0,
  };
}
