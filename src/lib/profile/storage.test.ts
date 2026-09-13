import { describe, expect, it } from "vitest";
import {
  LEGACY_RELIC_KEY,
  LEGACY_SKILL_KEY,
  loadProfile,
  parseProfile,
  PROFILE_KEY,
  readProfile,
  saveProfile,
  type StorageLike,
  UNREADABLE_KEY,
} from "./storage";
import { emptyProfile, type ProfileV1 } from "./types";

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

  it("treats a non-integer or fractional version as unreadable", () => {
    const raw = JSON.stringify({ version: 1.5, skills: {} });
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

  it("reads skill settings and repairs malformed ones", () => {
    const raw = JSON.stringify({
      ...emptyProfile(),
      proficiencyLevel: 40,
      skillsAtMax: true,
      activeSkillPreset: 3,
      skillPresets: [["Fire Slash", null, 7], "oops"],
    });
    const profile = parseProfile(raw);
    expect(profile?.proficiencyLevel).toBe(40);
    expect(profile?.skillsAtMax).toBe(true);
    expect(profile?.activeSkillPreset).toBe(3);
    expect(profile?.skillPresets).toHaveLength(5);
    expect(profile?.skillPresets[0]).toEqual(["Fire Slash", ...Array(9).fill(null)]);
    expect(profile?.skillPresets[1]).toEqual(Array(10).fill(null));
  });

  it("reads mastery levels, familiar stars and equipped familiars", () => {
    const raw = JSON.stringify({
      ...emptyProfile(),
      masteryNodes: { "1-D12": { level: 4 }, bad: { level: -1 } },
      familiars: { Hi: { stars: 11 }, Ku: { stars: "x" } },
      equippedFamiliars: { weapon: "Na", attribute: 3 },
    });
    const profile = parseProfile(raw);
    expect(profile?.masteryNodes).toEqual({ "1-D12": { level: 4 } });
    expect(profile?.familiars).toEqual({ Hi: { stars: 11 } });
    expect(profile?.equippedFamiliars).toEqual({ weapon: "Na", attribute: null, battle: null });
  });

  it("spirits saved before awakening existed read as Common at enhance 1", () => {
    const raw = JSON.stringify({
      ...emptyProfile(),
      spirits: {
        Ark: { owned: true, level: 12 },
        Bo: { owned: false, level: 3 },
        Kart: { owned: true, level: 5, awakening: "Immortal A1", enhance: 9 },
      },
      weaponAwakening: 12,
    });
    const profile = parseProfile(raw);
    expect(profile?.spirits.Ark).toEqual({ owned: true, level: 12, awakening: "Common", enhance: 1 });
    expect(profile?.spirits.Bo).toEqual({ owned: false, level: 3, awakening: null, enhance: 1 });
    expect(profile?.spirits.Kart).toEqual({ owned: true, level: 5, awakening: "Immortal A1", enhance: 5 });
    expect(profile?.accessoryAwakening).toBe(0);
    expect(profile?.weaponAwakening).toBe(12);
  });

  it("a profile saved before skill settings existed gets their defaults", () => {
    const raw = JSON.stringify({ version: 1, skills: { "Fire Slash": { level: 5 } } });
    const profile = parseProfile(raw);
    expect(profile?.proficiencyLevel).toBe(0);
    expect(profile?.skillsAtMax).toBe(false);
    expect(profile?.activeSkillPreset).toBe(0);
    expect(profile?.skillPresets).toEqual(emptyProfile().skillPresets);
  });

  it("skips a __proto__ key instead of polluting the prototype", () => {
    // A JS object literal treats `__proto__` specially, so the raw JSON is
    // written out by hand: this is exactly how the real attack arrives, as
    // a string a browser's JSON.parse turns into an ordinary own property.
    const raw = '{"version":1,"skills":{"__proto__":{"level":5},"Ice Stone":{"level":3}}}';
    const profile = parseProfile(raw);
    expect(profile?.skills).toEqual({ "Ice Stone": { level: 3 } });
    expect(Object.getPrototypeOf(profile?.skills)).toBe(Object.prototype);
  });

  it("keeps an unknown top-level key (e.g. a later build's field) after load and save", () => {
    const { storage } = memoryStorage();
    const raw = JSON.stringify({ ...emptyProfile(), companions: { x: 1 } });
    const profile = parseProfile(raw);
    expect(profile).not.toBeNull();
    const withCompanions = profile as unknown as { companions: unknown };
    expect(withCompanions.companions).toEqual({ x: 1 });

    expect(saveProfile(storage, profile as ProfileV1)).toBe(true);
    const roundTripped = JSON.parse(storage.getItem(PROFILE_KEY) ?? "null");
    expect(roundTripped.companions).toEqual({ x: 1 });
  });
});

describe("readProfile", () => {
  it("loads the known entries of a profile from a newer build as read-only", () => {
    const raw = JSON.stringify({
      version: 2,
      skills: { "Fire Slash": { level: 5 } },
      companions: { x: 1 },
    });
    const { data, storage } = memoryStorage({ [PROFILE_KEY]: raw });

    const { profile, readOnly } = readProfile(storage);

    expect(readOnly).toBe(true);
    expect(profile.skills).toEqual({ "Fire Slash": { level: 5 } });
    expect(data.get(UNREADABLE_KEY)).toBeUndefined();
    expect(data.get(PROFILE_KEY)).toBe(raw);
  });

  it("a version 1 profile is not read-only", () => {
    const { storage } = memoryStorage();
    saveProfile(storage, emptyProfile());
    expect(readProfile(storage).readOnly).toBe(false);
  });
});
