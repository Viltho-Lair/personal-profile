import { importLegacyLevels } from "./migration";
import {
  emptyProfile,
  SKILL_PRESET_COUNT,
  SKILL_PRESET_SLOTS,
  type GearState,
  type ProfileV1,
  type SkillPreset,
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

function equippedFamiliars(value: unknown): ProfileV1["equippedFamiliars"] {
  const stored = isRecord(value) ? value : {};
  return { weapon: name(stored.weapon), attribute: name(stored.attribute), battle: name(stored.battle) };
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
    spirits: entries(data.spirits, ownedLevelEntry),
    soulWeapons: entries(data.soulWeapons, ownedEntry),
    equippedSoulWeapon: name(data.equippedSoulWeapon),
    // Added after the first release, so older profiles read the defaults.
    proficiencyLevel: wholeLevel(data.proficiencyLevel) ?? 0,
    skillsAtMax: data.skillsAtMax === true,
    skillPresets: skillPresets(data.skillPresets),
    activeSkillPreset: presetIndex(data.activeSkillPreset),
    masteryNodes: entries(data.masteryNodes, levelEntry),
    familiars: entries(data.familiars, starsEntry),
    equippedFamiliars: equippedFamiliars(data.equippedFamiliars),
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
