import { describe, expect, it } from "vitest";
import {
  LEGACY_RELIC_KEY,
  LEGACY_SKILL_KEY,
  loadProfile,
  parseProfile,
  PROFILE_KEY,
  saveProfile,
  type StorageLike,
  UNREADABLE_KEY,
} from "./storage";
import { emptyProfile } from "./types";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: StorageLike = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
  return { data, storage };
}

describe("loadProfile", () => {
  it("starts empty when nothing is stored, and writes nothing", () => {
    const { data, storage } = memoryStorage();
    expect(loadProfile(storage)).toEqual(emptyProfile());
    expect(data.size).toBe(0);
  });

  it("reads back a saved profile", () => {
    const { storage } = memoryStorage();
    const profile = { ...emptyProfile(), skills: { "Fire Slash": { level: 12 } }, equippedWeapon: "Epic 1" };
    expect(saveProfile(storage, profile)).toBe(true);
    expect(loadProfile(storage)).toEqual(profile);
  });

  it("backs up an unreadable profile and starts empty", () => {
    const { data, storage } = memoryStorage({ [PROFILE_KEY]: "{broken" });
    expect(loadProfile(storage)).toEqual(emptyProfile());
    expect(data.get(UNREADABLE_KEY)).toBe("{broken");
  });

  it("treats an unknown version as unreadable", () => {
    const raw = JSON.stringify({ version: 2, skills: {} });
    const { data, storage } = memoryStorage({ [PROFILE_KEY]: raw });
    expect(loadProfile(storage)).toEqual(emptyProfile());
    expect(data.get(UNREADABLE_KEY)).toBe(raw);
  });

  it("imports legacy levels when no profile exists, then removes the old keys", () => {
    const { data, storage } = memoryStorage({
      [LEGACY_SKILL_KEY]: '{"2":36}',
      [LEGACY_RELIC_KEY]: '{"0":100}',
    });
    const profile = loadProfile(storage);
    expect(profile.skills).toEqual({ "Ice Stone": { level: 36 } });
    expect(profile.relics).toEqual({ "Strength Gloves": { level: 100 } });
    expect(JSON.parse(data.get(PROFILE_KEY) ?? "null")).toEqual(profile);
    expect(data.has(LEGACY_SKILL_KEY)).toBe(false);
    expect(data.has(LEGACY_RELIC_KEY)).toBe(false);
  });

  it("never imports legacy levels over an existing profile", () => {
    const existing = { ...emptyProfile(), skills: { "Ice Stone": { level: 200 } } };
    const { data, storage } = memoryStorage({
      [PROFILE_KEY]: JSON.stringify(existing),
      [LEGACY_SKILL_KEY]: '{"2":36}',
    });
    expect(loadProfile(storage)).toEqual(existing);
    expect(data.has(LEGACY_SKILL_KEY)).toBe(false);
  });

  it("keeps the legacy keys if the migrated profile cannot be saved", () => {
    const { data, storage } = memoryStorage({ [LEGACY_SKILL_KEY]: '{"2":36}' });
    storage.setItem = () => {
      throw new Error("quota");
    };
    expect(loadProfile(storage).skills).toEqual({ "Ice Stone": { level: 36 } });
    expect(data.has(LEGACY_SKILL_KEY)).toBe(true);
  });

  it("survives storage that throws on read", () => {
    const storage: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    expect(loadProfile(storage)).toEqual(emptyProfile());
  });
});

describe("parseProfile", () => {
  it("drops malformed entries and keeps valid ones", () => {
    const raw = JSON.stringify({
      ...emptyProfile(),
      skills: { "Fire Slash": { level: 5 }, Broken: { level: "high" } },
      weapons: { "Common 4": { owned: true, level: 3 }, Bad: { owned: "yes", level: 1 } },
      equippedWeapon: 42,
    });
    const profile = parseProfile(raw);
    expect(profile?.skills).toEqual({ "Fire Slash": { level: 5 } });
    expect(profile?.weapons).toEqual({ "Common 4": { owned: true, level: 3 } });
    expect(profile?.equippedWeapon).toBeNull();
  });
});
