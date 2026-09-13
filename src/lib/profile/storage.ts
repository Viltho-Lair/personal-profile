import { importLegacyLevels } from "./migration";
import { emptyProfile, type GearState, type ProfileV1 } from "./types";

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

/** A stored profile, or null if it is not a readable version 1 profile. */
export function parseProfile(raw: string): ProfileV1 | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data) || data.version !== 1) return null;

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
  };
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

export function loadProfile(storage: StorageLike): ProfileV1 {
  const raw = read(storage, PROFILE_KEY);

  if (raw !== null) {
    // A profile exists, so old keys are removed without being imported.
    removeLegacyKeys(storage);
    const parsed = parseProfile(raw);
    if (parsed !== null) return parsed;
    write(storage, UNREADABLE_KEY, raw);
    return emptyProfile();
  }

  const skillRaw = read(storage, LEGACY_SKILL_KEY);
  const relicRaw = read(storage, LEGACY_RELIC_KEY);
  if (skillRaw === null && relicRaw === null) return emptyProfile();

  const migrated = importLegacyLevels(skillRaw, relicRaw);
  if (saveProfile(storage, migrated)) removeLegacyKeys(storage);
  return migrated;
}
