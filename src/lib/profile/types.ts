import type { GemPlacement, SoulGem } from "@/lib/game/engraving";

/** Weapons and accessories are graded, and keyed by grade name ("Common 4"). */
export type GearKind = "weapons" | "accessories";
export type OwnableKind = GearKind | "spirits" | "soulWeapons";
export type EquippableKind = GearKind | "soulWeapons";

export type GearState = { owned: boolean; level: number };

/** A spirit's awakening tier ("Legendary A3"), level, and enhance (its skill level, 1-5). */
export type SpiritState = { owned: boolean; level: number; awakening: string | null; enhance: number };
export const MIN_SPIRIT_ENHANCE = 1;
export const MAX_SPIRIT_ENHANCE = 5;
/** The tier a spirit is at when first owned. */
export const FIRST_SPIRIT_TIER = "Common";

/** Every preset kind (skills, spirits, familiars ...) has five presets. */
export const PRESET_COUNT = 5;
export const SKILL_PRESET_COUNT = PRESET_COUNT;
export const SKILL_PRESET_SLOTS = 10;

/** Skill names per slot, filled top row left to right, then the bottom row. */
export type SkillPreset = (string | null)[];

export const PROMOTION_SLOTS = 7;

/** One promotion row: the rolled option ("Extra ATK") and its colour tier (index, 0 = White). */
export type PromotionRoll = { option: string | null; tier: number | null };

/** A companion's advancement (skin number, 0 = "Elf 000"), passive skill levels by name, and promotion rolls. */
export type CompanionState = {
  advancement: number;
  skills: Record<string, number>;
  promotion: PromotionRoll[];
};

export function emptyCompanion(): CompanionState {
  return {
    advancement: 0,
    skills: {},
    promotion: Array.from({ length: PROMOTION_SLOTS }, () => ({ option: null, tier: null })),
  };
}

export const LATENT_STATS = ["STR", "HP", "VIT", "CRI", "LUK"] as const;
export const LATENT_SLOTS = 5;
export const ABILITY_SLOTS = 7;

/** One promotion additional ability row: option, rolled value and the row's multiplier (1-4). */
export type AbilityRoll = { option: string | null; value: number | null; multiplier: number };

export type CharacterState = {
  /** Enhance levels by stat name ("ATK", "DEATH STRIKE %"). */
  enhance: Record<string, number>;
  /** Grade indexes into the Growing Knowledge table (0 = Not Obtained). */
  growingKnowledge: number;
  superhuman: number;
  /** Growth levels by stat key ("STR", "ACC"). */
  growth: Record<string, number>;
  slayerLevel: number;
  /** Latent Power values: stat -> the five slots I-V. */
  latent: Record<string, number[]>;
  latentAwakening: { grade: number; level: number };
  /** Current promotion number (0 = none, 1 = Stone). */
  promotion: number;
  classes: Record<string, { owned: boolean; level: number }>;
  equippedClass: string | null;
  /** Awakened Blast, 0-18. */
  classAwakening: number;
  /** Memory Tree sub node levels by sub node id. */
  memoryTree: Record<string, number>;
  /** Constellation stars by node id: 1 = another star, 2 = the matching star (none when absent). */
  constellation: Record<string, number>;
};

export function emptyCharacter(): CharacterState {
  return {
    enhance: {},
    growingKnowledge: 0,
    superhuman: 0,
    growth: {},
    slayerLevel: 1,
    latent: Object.fromEntries(LATENT_STATS.map((stat) => [stat, Array<number>(LATENT_SLOTS).fill(0)])),
    latentAwakening: { grade: 0, level: 0 },
    promotion: 0,
    classes: {},
    equippedClass: null,
    classAwakening: 0,
    memoryTree: {},
    constellation: {},
  };
}

export type FamiliarGroup = "weapon" | "attribute" | "battle";
export const FAMILIAR_GROUPS: readonly FamiliarGroup[] = ["weapon", "attribute", "battle"];
export const MAX_FAMILIAR_STARS = 11;

export const SPIRIT_PRESET_SLOTS = 3;
/** Spirits marked main; once all six are set, every other spirit carries the lowest of their levels. */
export const MAIN_SPIRIT_COUNT = 6;
/** A Slayer Promotion page's effect, taken from the current promotion's row. */
export const PROMOTION_EFFECTS = ["Extra ATK", "Extra HP", "Extra EXP", "Monster Gold"] as const;

/** A Slayer Promotion Ability preset: the page effect and its 7 additional ability rows. */
export type AbilityPreset = { effect: string | null; rows: AbilityRoll[] };

export type FamiliarPreset = Record<FamiliarGroup, string | null>;

/**
 * Presets other than skills. Skill Stone and Beast presets are only chosen
 * for now; what they hold arrives with those screens.
 */
export type Presets = {
  spirits: (string | null)[][];
  familiars: FamiliarPreset[];
  abilities: AbilityPreset[];
};

export type PresetKind = "spirits" | "skillStones" | "beasts" | "familiars" | "abilities";
export const PRESET_KINDS: readonly PresetKind[] = ["spirits", "skillStones", "beasts", "familiars", "abilities"];

export function emptyAbilityPreset(): AbilityPreset {
  return {
    effect: null,
    rows: Array.from({ length: ABILITY_SLOTS }, () => ({ option: null, value: null, multiplier: 1 })),
  };
}

export function emptyPresets(): Presets {
  return {
    spirits: Array.from({ length: PRESET_COUNT }, () => Array<string | null>(SPIRIT_PRESET_SLOTS).fill(null)),
    familiars: Array.from({ length: PRESET_COUNT }, () => ({ weapon: null, attribute: null, battle: null })),
    abilities: Array.from({ length: PRESET_COUNT }, emptyAbilityPreset),
  };
}

/** Soul weapon engraving: the chaos level, the eight soul gems and each weapon's plate. */
export type SoulEngraving = {
  chaosLevel: number;
  /** What the chaos level adds to completion effects, as a fraction (0.19 = +19%). */
  chaosBonus: number;
  gems: (SoulGem | null)[];
  /** Gems placed on each soul weapon's plate, by weapon name. */
  plates: Record<string, GemPlacement[]>;
  /** Completion ticked by hand, for weapons whose plate layout isn't known. */
  completed: Record<string, boolean>;
};

export function emptySoulEngraving(): SoulEngraving {
  return { chaosLevel: 0, chaosBonus: 0, gems: Array<SoulGem | null>(8).fill(null), plates: {}, completed: {} };
}

export const emptyActivePresets = (): Record<PresetKind, number> => ({
  spirits: 0,
  skillStones: 0,
  beasts: 0,
  familiars: 0,
  abilities: 0,
});

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
  spirits: Record<string, SpiritState>;
  soulWeapons: Record<string, { owned: boolean }>;
  equippedSoulWeapon: string | null;
  proficiencyLevel: number;
  /** While on, every skill counts as its max level; typed levels are kept. */
  skillsAtMax: boolean;
  skillPresets: SkillPreset[];
  activeSkillPreset: number;
  /** Skill Mastery node levels by node id ("1-D12"); checkbox nodes use 0 or 1. */
  masteryNodes: Record<string, { level: number }>;
  /** Owned familiars and their stars (0-11); absent means not owned. */
  familiars: Record<string, { stars: number }>;
  /** Spirit, familiar and Slayer Promotion Ability presets; the active familiar preset is what's equipped. */
  presets: Presets;
  activePresets: Record<PresetKind, number>;
  /** Spirits marked as the main six. */
  mainSpirits: string[];
  /** The Stats Summary adds the active skill preset's buffs. */
  includeSkills: boolean;
  soulEngraving: SoulEngraving;
  /** Times weapons (Orr) and accessories (Orb) have been awakened, 0-30. */
  weaponAwakening: number;
  accessoryAwakening: number;
  companions: Record<string, CompanionState>;
  /** Familiar Proficiency levels. */
  familiarProficiency: { attribute: number; weapon: number; battle: number };
  /** Awakened Fountain of Circulation: the 1st-4th companion effects, as fractions (0.05 = 5%). */
  fountainEffects: number[];
  character: CharacterState;
};

export type KnownNames = Record<
  "skills" | "weapons" | "accessories" | "relics" | "spirits" | "soulWeapons",
  string[]
> & { masteryNodes?: string[]; familiars?: string[] };

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
    masteryNodes: {},
    familiars: {},
    presets: emptyPresets(),
    activePresets: emptyActivePresets(),
    mainSpirits: [],
    includeSkills: false,
    soulEngraving: emptySoulEngraving(),
    weaponAwakening: 0,
    accessoryAwakening: 0,
    companions: {},
    familiarProficiency: { attribute: 0, weapon: 0, battle: 0 },
    fountainEffects: [0, 0, 0, 0],
    character: emptyCharacter(),
  };
}
