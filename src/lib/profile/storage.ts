import type { SkillStone } from "@/lib/game/battle";
import { emptyShrineLevels, SHRINE_KEYS } from "@/lib/game/shrine";
import { emptyBlackOrb } from "@/lib/game/black-orb";
import { importLegacyLevels } from "./migration";
import {
  ABILITY_SLOTS,
  emptyCharacter,
  emptyCompanion,
  LATENT_SLOTS,
  LATENT_STATS,
  emptyProfile,
  FIRST_SPIRIT_TIER,
  MAX_SPIRIT_ENHANCE,
  MIN_SPIRIT_ENHANCE,
  emptyActivePresets,
  emptySoulEngraving,
  DEFAULT_FIGHT_SECONDS,
  emptyPresets,
  MAIN_SPIRIT_COUNT,
  PRESET_COUNT,
  PRESET_KINDS,
  PROMOTION_EFFECTS,
  PROMOTION_SLOTS,
  SKILL_PRESET_COUNT,
  SPIRIT_PRESET_SLOTS,
  type AbilityRoll,
  type Presets,
  type SoulEngraving,
  SKILL_PRESET_SLOTS,
  type CharacterState,
  type CompanionState,
  type GearState,
  type ProfileV1,
  type SkillPreset,
  type SpiritState,
} from "./types";

export const PROFILE_KEY = "slayer-analyzer.profile";
export const UNREADABLE_KEY = "slayer-analyzer.profile.unreadable";
export const LEGACY_SKILL_KEY = "analyzer.skillLevels";
export const LEGACY_RELIC_KEY = "analyzer.relicLevels";

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const wholeLevel = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : null;

function entries<T>(value: unknown, read: (entry: Json) => T | null): Record<string, T> {
  const result: Record<string, T> = {};
  if (!isRecord(value)) return result;
  for (const [name, entry] of Object.entries(value)) {
    // "__proto__" as an own key would otherwise reach into Object.prototype
    // through the assignment below instead of landing in `result`.
    if (name === "__proto__") continue;
    const parsed = isRecord(entry) ? read(entry) : null;
    if (parsed !== null) result[name] = parsed;
  }
  return result;
}

const levelEntry = (entry: Json) => {
  const level = wholeLevel(entry.level);
  return level === null ? null : { level };
};

const ownedLevelEntry = (entry: Json): GearState | null => {
  const level = wholeLevel(entry.level);
  return level === null || typeof entry.owned !== "boolean"
    ? null
    : { owned: entry.owned, level };
};

/** Spirits saved before awakening and enhance existed read as Common at enhance 1. */
const spiritEntry = (entry: Json): SpiritState | null => {
  const base = ownedLevelEntry(entry);
  if (base === null) return null;
  const tier = typeof entry.awakening === "string" ? entry.awakening : null;
  const awakening = tier ?? (base.owned ? FIRST_SPIRIT_TIER : null);
  const enhance = wholeLevel(entry.enhance);
  return {
    owned: awakening !== null,
    level: base.level,
    awakening,
    enhance: Math.min(MAX_SPIRIT_ENHANCE, Math.max(MIN_SPIRIT_ENHANCE, enhance ?? MIN_SPIRIT_ENHANCE)),
  };
};

function companionEntry(entry: Json): CompanionState {
  const skills: Record<string, number> = {};
  if (isRecord(entry.skills)) {
    for (const [skill, level] of Object.entries(entry.skills)) {
      const whole = wholeLevel(level);
      if (skill !== "__proto__" && whole !== null) skills[skill] = whole;
    }
  }
  const rolls = Array.isArray(entry.promotion) ? entry.promotion : [];
  const promotion = Array.from({ length: PROMOTION_SLOTS }, (_, slot) => {
    const roll = isRecord(rolls[slot]) ? rolls[slot] : {};
    return { option: name(roll.option), tier: wholeLevel(roll.tier) };
  });
  return { ...emptyCompanion(), advancement: wholeLevel(entry.advancement) ?? 0, skills, promotion };
}

function familiarProficiency(value: unknown): ProfileV1["familiarProficiency"] {
  const stored = isRecord(value) ? value : {};
  return {
    attribute: wholeLevel(stored.attribute) ?? 0,
    weapon: wholeLevel(stored.weapon) ?? 0,
    battle: wholeLevel(stored.battle) ?? 0,
  };
}

function wholeRecord(value: unknown): Record<string, number> {
  const result: Record<string, number> = {};
  if (!isRecord(value)) return result;
  for (const [key, level] of Object.entries(value)) {
    const whole = wholeLevel(level);
    if (key !== "__proto__" && whole !== null) result[key] = whole;
  }
  return result;
}

const finiteOr = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

function character(value: unknown): CharacterState {
  const base = emptyCharacter();
  if (!isRecord(value)) return base;
  const latent = isRecord(value.latent) ? value.latent : {};
  const awakening = isRecord(value.latentAwakening) ? value.latentAwakening : {};
  return {
    enhance: wholeRecord(value.enhance),
    growingKnowledge: wholeLevel(value.growingKnowledge) ?? 0,
    superhuman: wholeLevel(value.superhuman) ?? 0,
    growth: wholeRecord(value.growth),
    slayerLevel: wholeLevel(value.slayerLevel) ?? base.slayerLevel,
    latent: Object.fromEntries(
      LATENT_STATS.map((stat) => {
        const slots = Array.isArray(latent[stat]) ? latent[stat] : [];
        return [stat, Array.from({ length: LATENT_SLOTS }, (_, i) => Math.max(0, finiteOr(slots[i], 0)))];
      }),
    ),
    latentAwakening: { grade: wholeLevel(awakening.grade) ?? 0, level: wholeLevel(awakening.level) ?? 0 },
    promotion: wholeLevel(value.promotion) ?? 0,
    classes: entries(value.classes, ownedLevelEntry),
    equippedClass: name(value.equippedClass),
    classAwakening: wholeLevel(value.classAwakening) ?? 0,
    memoryTree: wholeRecord(value.memoryTree),
    constellation: Object.fromEntries(
      Object.entries(wholeRecord(value.constellation)).filter(([, star]) => star === 1 || star === 2),
    ),
  };
}

const FOUNTAIN_SLOTS = 4;

function fountainEffects(value: unknown): number[] {
  const stored = Array.isArray(value) ? value : [];
  return Array.from({ length: FOUNTAIN_SLOTS }, (_, i) => {
    const effect = stored[i];
    return typeof effect === "number" && Number.isFinite(effect) && effect >= 0 ? effect : 0;
  });
}

const ownedEntry = (entry: Json) =>
  typeof entry.owned === "boolean" ? { owned: entry.owned } : null;

const name = (value: unknown) => (typeof value === "string" ? value : null);

/** Always 5 presets of 10 slots; anything that isn't a skill name reads as empty. */
function skillPresets(value: unknown): SkillPreset[] {
  const stored = Array.isArray(value) ? value : [];
  return Array.from({ length: SKILL_PRESET_COUNT }, (_, preset) => {
    const slots = Array.isArray(stored[preset]) ? stored[preset] : [];
    return Array.from({ length: SKILL_PRESET_SLOTS }, (_, slot) => name(slots[slot]));
  });
}

const starsEntry = (entry: Json) => {
  const stars = wholeLevel(entry.stars);
  return stars === null ? null : { stars };
};

function familiarPreset(value: unknown): Presets["familiars"][number] {
  const stored = isRecord(value) ? value : {};
  return { weapon: name(stored.weapon), attribute: name(stored.attribute), battle: name(stored.battle) };
}

function abilityRows(value: unknown): AbilityRoll[] {
  const rolls = Array.isArray(value) ? value : [];
  return Array.from({ length: ABILITY_SLOTS }, (_, i) => {
    const roll = isRecord(rolls[i]) ? rolls[i] : {};
    const multiplier = wholeLevel(roll.multiplier);
    return {
      option: name(roll.option),
      value: typeof roll.value === "number" && Number.isFinite(roll.value) ? roll.value : null,
      multiplier: multiplier !== null && multiplier >= 1 && multiplier <= 4 ? multiplier : 1,
    };
  });
}

/**
 * Five presets of each kind. Profiles saved before presets existed move
 * their equipped familiars and ability rows into preset 1.
 */
function presets(data: Json): Presets {
  const stored = isRecord(data.presets) ? data.presets : {};
  const list = (value: unknown) => (Array.isArray(value) ? value : []);
  const base = emptyPresets();
  const legacyCharacter = isRecord(data.character) ? data.character : {};
  return {
    skillStones: base.skillStones.map((_, i) => skillStoneSet(list(stored.skillStones)[i])),
    spirits: base.spirits.map((_, i) => {
      const slots = list(list(stored.spirits)[i]);
      return Array.from({ length: SPIRIT_PRESET_SLOTS }, (_, slot) => name(slots[slot]));
    }),
    familiars: base.familiars.map((_, i) => {
      const preset = list(stored.familiars)[i];
      return familiarPreset(preset === undefined && i === 0 ? data.equippedFamiliars : preset);
    }),
    beasts: base.beasts.map((_, i) => name(list(stored.beasts)[i])),
    abilities: base.abilities.map((_, i) => {
      const preset = list(stored.abilities)[i];
      if (preset === undefined && i === 0 && Array.isArray(legacyCharacter.abilities)) {
        return { effect: null, rows: abilityRows(legacyCharacter.abilities) };
      }
      const entry = isRecord(preset) ? preset : {};
      const effect = name(entry.effect);
      return {
        effect: effect && (PROMOTION_EFFECTS as readonly string[]).includes(effect) ? effect : null,
        rows: abilityRows(entry.rows),
      };
    }),
  };
}

const STONE_ELEMENTS = ["Fire", "Water", "Wind", "Earth"] as const;

function skillStone(value: unknown): SkillStone | null {
  if (!isRecord(value)) return null;
  const element = STONE_ELEMENTS.find((e) => e === value.element);
  const grade: SkillStone["grade"] | null = value.grade === "A" ? "A" : value.grade === "B" ? "B" : null;
  return element && grade ? { grade, element } : null;
}

function skillStoneSet(value: unknown): Presets["skillStones"][number] {
  const stored = isRecord(value) ? value : {};
  return { cooldown: skillStone(stored.cooldown), time: skillStone(stored.time), heat: skillStone(stored.heat) };
}

function promotionTarget(value: unknown): ProfileV1["promotionTarget"] {
  const stored = isRecord(value) ? value : {};
  const duration = wholeLevel(stored.duration);
  return {
    promotion: wholeLevel(stored.promotion),
    duration: duration !== null && duration >= 1 ? duration : DEFAULT_FIGHT_SECONDS,
  };
}

function activePresets(value: unknown): ProfileV1["activePresets"] {
  const stored = isRecord(value) ? value : {};
  const active = emptyActivePresets();
  for (const kind of PRESET_KINDS) {
    const index = stored[kind];
    if (typeof index === "number" && Number.isInteger(index) && index >= 0 && index < PRESET_COUNT) active[kind] = index;
  }
  return active;
}

const GEM_SHAPE_COUNT = 7;
const GEM_RARITY_COUNT = 6;

function soulEngraving(value: unknown): SoulEngraving {
  const base = emptySoulEngraving();
  if (!isRecord(value)) return base;
  const storedGems = Array.isArray(value.gems) ? value.gems : [];
  const gems = base.gems.map((_, i) => {
    const gem = isRecord(storedGems[i]) ? storedGems[i] : null;
    if (!gem) return null;
    const shape = wholeLevel(gem.shape);
    const rarity = wholeLevel(gem.rarity);
    if (shape === null || shape < 1 || shape > GEM_SHAPE_COUNT || rarity === null || rarity >= GEM_RARITY_COUNT) return null;
    return { shape, rarity, level: wholeLevel(gem.level) ?? 1, value: Math.max(0, finiteOr(gem.value, 0)) };
  });
  const plates: SoulEngraving["plates"] = {};
  if (isRecord(value.plates)) {
    for (const [weapon, placements] of Object.entries(value.plates)) {
      if (weapon === "__proto__" || !Array.isArray(placements)) continue;
      const seen = new Set<number>();
      plates[weapon] = placements.flatMap((p) => {
        if (!isRecord(p)) return [];
        const gem = wholeLevel(p.gem);
        const row = wholeLevel(p.row);
        const col = wholeLevel(p.col);
        if (gem === null || gem >= base.gems.length || !gems[gem] || seen.has(gem) || row === null || col === null) return [];
        seen.add(gem);
        return [{ gem, row, col, rotation: (wholeLevel(p.rotation) ?? 0) % 4 }];
      });
    }
  }
  const completed: SoulEngraving["completed"] = {};
  if (isRecord(value.completed)) {
    for (const [weapon, on] of Object.entries(value.completed)) if (weapon !== "__proto__" && on === true) completed[weapon] = true;
  }
  return {
    chaosLevel: wholeLevel(value.chaosLevel) ?? 0,
    chaosBonus: Math.max(0, finiteOr(value.chaosBonus, 0)),
    gems,
    plates,
    completed,
  };
}

const ORB_LINE_ELEMENTS = ["Fire", "Water", "Wind", "Earth", "All"] as const;

function blackOrb(value: unknown): ProfileV1["blackOrb"] {
  const orb = emptyBlackOrb();
  if (!isRecord(value)) return orb;
  orb.level = wholeLevel(value.level) ?? 0;
  const accessories = isRecord(value.accessories) ? value.accessories : {};
  for (const element of STONE_ELEMENTS) {
    const stored = isRecord(accessories[element]) ? accessories[element] : {};
    const lines = Array.isArray(stored.lines) ? stored.lines : [];
    orb.accessories[element] = {
      level: wholeLevel(stored.level) ?? 0,
      top: Math.max(0, finiteOr(stored.top, 0)),
      lines: orb.accessories[element].lines.map((empty, i) => {
        const line = isRecord(lines[i]) ? lines[i] : {};
        return {
          element: ORB_LINE_ELEMENTS.find((e) => e === line.element) ?? null,
          value: Math.max(0, finiteOr(line.value, 0)),
          bonus: Math.min(6, wholeLevel(line.bonus) ?? empty.bonus),
        };
      }),
    };
  }
  return orb;
}

const MAX_BEAST_AWAKEN = 6;
const MAX_BEAST_AFFECTION = 70;

function beasts(value: unknown): ProfileV1["beasts"] {
  const result: ProfileV1["beasts"] = {};
  if (!isRecord(value)) return result;
  for (const [beast, state] of Object.entries(value)) {
    if (beast === "__proto__" || !isRecord(state)) continue;
    const awaken = wholeLevel(state.awaken);
    result[beast] = {
      awaken: awaken === null ? null : Math.min(MAX_BEAST_AWAKEN, awaken),
      affection: Math.min(MAX_BEAST_AFFECTION, Math.max(1, wholeLevel(state.affection) ?? 1)),
    };
  }
  return result;
}

function appearance(value: unknown): ProfileV1["appearance"] {
  const list = (items: unknown) =>
    Array.isArray(items) ? [...new Set(items.filter((item): item is string => typeof item === "string" && item.length > 0))] : [];
  return isRecord(value) ? { clothing: list(value.clothing), guild: list(value.guild) } : { clothing: [], guild: [] };
}

const MAX_SHRINE_LEVEL = 999;

function sealedShrine(value: unknown): ProfileV1["sealedShrine"] {
  const levels = emptyShrineLevels();
  if (!isRecord(value)) return levels;
  for (const key of SHRINE_KEYS) levels[key] = Math.min(MAX_SHRINE_LEVEL, wholeLevel(value[key]) ?? 0);
  return levels;
}

const REFINEMENT_LINES = 5;

function skillRefinement(value: unknown): ProfileV1["skillRefinement"] {
  const result: ProfileV1["skillRefinement"] = {};
  if (!isRecord(value)) return result;
  for (const [skill, lines] of Object.entries(value)) {
    if (skill === "__proto__" || !Array.isArray(lines)) continue;
    result[skill] = Array.from({ length: Math.min(REFINEMENT_LINES, lines.length) }, (_, i) => {
      const line = isRecord(lines[i]) ? lines[i] : {};
      return {
        option: name(line.option),
        value: typeof line.value === "number" && Number.isFinite(line.value) ? line.value : null,
      };
    });
  }
  return result;
}

function mainSpirits(value: unknown): string[] {
  const names = (Array.isArray(value) ? value : []).filter((n): n is string => typeof n === "string");
  return [...new Set(names)].slice(0, MAIN_SPIRIT_COUNT);
}

const presetIndex = (value: unknown): number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value < SKILL_PRESET_COUNT
    ? value
    : 0;

const isNewerVersion = (version: unknown): boolean =>
  typeof version === "number" && Number.isInteger(version) && version > 1;

/** The fields this build knows how to read, regardless of stored version. */
function parseKnownFields(data: Json): ProfileV1 {
  return {
    version: 1,
    skills: entries(data.skills, levelEntry),
    weapons: entries(data.weapons, ownedLevelEntry),
    accessories: entries(data.accessories, ownedLevelEntry),
    equippedWeapon: name(data.equippedWeapon),
    equippedAccessory: name(data.equippedAccessory),
    relics: entries(data.relics, levelEntry),
    spirits: entries(data.spirits, spiritEntry),
    soulWeapons: entries(data.soulWeapons, ownedEntry),
    equippedSoulWeapon: name(data.equippedSoulWeapon),
    // Added after the first release, so older profiles read the defaults.
    proficiencyLevel: wholeLevel(data.proficiencyLevel) ?? 0,
    skillsAtMax: data.skillsAtMax === true,
    skillPresets: skillPresets(data.skillPresets),
    activeSkillPreset: presetIndex(data.activeSkillPreset),
    masteryNodes: entries(data.masteryNodes, levelEntry),
    familiars: entries(data.familiars, starsEntry),
    presets: presets(data),
    activePresets: activePresets(data.activePresets),
    mainSpirits: mainSpirits(data.mainSpirits),
    includeSkills: data.includeSkills === true,
    soulEngraving: soulEngraving(data.soulEngraving),
    skillRefinement: skillRefinement(data.skillRefinement),
    sealedShrine: sealedShrine(data.sealedShrine),
    appearance: appearance(data.appearance),
    beasts: beasts(data.beasts),
    blackOrb: blackOrb(data.blackOrb),
    promotionTarget: promotionTarget(data.promotionTarget),
    weaponAwakening: wholeLevel(data.weaponAwakening) ?? 0,
    accessoryAwakening: wholeLevel(data.accessoryAwakening) ?? 0,
    companions: entries(data.companions, companionEntry),
    familiarProficiency: familiarProficiency(data.familiarProficiency),
    fountainEffects: fountainEffects(data.fountainEffects),
    character: character(data.character),
  };
}

/** A stored profile, or null if it is not a readable version 1 profile. */
export function parseProfile(raw: string): ProfileV1 | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data) || data.version !== 1) return null;

  const validated = parseKnownFields(data);
  // Top-level keys this build doesn't understand (e.g. a later build's
  // "companions") ride along unvalidated so saving the profile back doesn't
  // drop them. This is the one boundary where that untyped data enters
  // ProfileV1, hence the cast.
  return { ...data, ...validated } as ProfileV1;
}

/**
 * A stored profile from a build newer than this one (an integer version
 * greater than 1): parsed using only the fields this build knows, for
 * display. `null` if the stored version isn't a readable newer version.
 */
function parseNewerProfile(raw: string): ProfileV1 | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data) || !isNewerVersion(data.version)) return null;
  return parseKnownFields(data);
}

// Storage can be unavailable (private windows, blocked site data), so every
// access is guarded and the profile then lasts for the session only.
function read(storage: StorageLike, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function write(storage: StorageLike, key: string, value: string): boolean {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeLegacyKeys(storage: StorageLike) {
  for (const key of [LEGACY_SKILL_KEY, LEGACY_RELIC_KEY]) {
    try {
      storage.removeItem(key);
    } catch {
      // Leaving an old key behind is harmless; it is never imported over a profile.
    }
  }
}

export function saveProfile(storage: StorageLike, profile: ProfileV1): boolean {
  return write(storage, PROFILE_KEY, JSON.stringify(profile));
}

/** The raw `PROFILE_KEY` value, guarded the same way as every other read. */
export function readProfileRaw(storage: StorageLike): string | null {
  return read(storage, PROFILE_KEY);
}

/**
 * Reads the stored profile. `readOnly` is true when the stored profile was
 * written by a newer build (an integer version greater than 1): its known
 * fields are parsed for display, but it must never be saved over, since that
 * would discard whatever that newer version added.
 */
export function readProfile(storage: StorageLike): { profile: ProfileV1; readOnly: boolean } {
  const raw = read(storage, PROFILE_KEY);

  if (raw !== null) {
    // A profile exists, so old keys are removed without being imported.
    removeLegacyKeys(storage);
    const parsed = parseProfile(raw);
    if (parsed !== null) return { profile: parsed, readOnly: false };

    const newer = parseNewerProfile(raw);
    if (newer !== null) return { profile: newer, readOnly: true };

    write(storage, UNREADABLE_KEY, raw);
    return { profile: emptyProfile(), readOnly: false };
  }

  const skillRaw = read(storage, LEGACY_SKILL_KEY);
  const relicRaw = read(storage, LEGACY_RELIC_KEY);
  if (skillRaw === null && relicRaw === null) return { profile: emptyProfile(), readOnly: false };

  const migrated = importLegacyLevels(skillRaw, relicRaw);
  if (saveProfile(storage, migrated)) removeLegacyKeys(storage);
  return { profile: migrated, readOnly: false };
}

export function loadProfile(storage: StorageLike): ProfileV1 {
  return readProfile(storage).profile;
}
