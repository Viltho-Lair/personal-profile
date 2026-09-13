import { describe, expect, it, vi } from "vitest";
import { setSkillLevel } from "./rules";
import { createProfileStore } from "./store";
import { PROFILE_KEY, UNREADABLE_KEY, type StorageLike } from "./storage";
import { emptyProfile } from "./types";

function memoryStorage() {
  const data = new Map<string, string>();
  const storage: StorageLike = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
  return { data, storage };
}

describe("createProfileStore", () => {
  it("returns the same snapshot until something changes", () => {
    const { storage } = memoryStorage();
    const store = createProfileStore(() => storage);
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it("saves every update and notifies subscribers", () => {
    const { data, storage } = memoryStorage();
    const store = createProfileStore(() => storage);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.update((p) => setSkillLevel(p, "Fire Slash", 7, 250));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().skills["Fire Slash"]).toEqual({ level: 7 });
    expect(JSON.parse(data.get(PROFILE_KEY) ?? "null").skills).toEqual({ "Fire Slash": { level: 7 } });

    unsubscribe();
    store.update((p) => setSkillLevel(p, "Fire Slash", 8, 250));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("works for the session when no storage is available", () => {
    const store = createProfileStore(() => null);
    expect(store.getSnapshot()).toEqual(emptyProfile());
    store.update((p) => setSkillLevel(p, "Fire Slash", 3, 250));
    expect(store.getSnapshot().skills["Fire Slash"]).toEqual({ level: 3 });
  });
});

describe("a stale tab must not overwrite a newer profile", () => {
  it("update() reloads before applying a change when storage changed behind the cache", () => {
    const { storage } = memoryStorage();
    const store = createProfileStore(() => storage);
    store.update((p) => setSkillLevel(p, "Fire Slash", 5, 250));

    // Another tab saves on top of what this store already loaded.
    const other = setSkillLevel(store.getSnapshot(), "Ice Stone", 9, 250);
    storage.setItem(PROFILE_KEY, JSON.stringify(other));

    store.update((p) => setSkillLevel(p, "Lightning Slash", 3, 250));

    expect(store.getSnapshot().skills).toEqual({
      "Fire Slash": { level: 5 },
      "Ice Stone": { level: 9 },
      "Lightning Slash": { level: 3 },
    });
  });

  it("refresh() picks up an external change and notifies listeners", () => {
    const { storage } = memoryStorage();
    const store = createProfileStore(() => storage);
    store.getSnapshot(); // establishes the baseline raw value

    const listener = vi.fn();
    store.subscribe(listener);
    const other = setSkillLevel(emptyProfile(), "Ice Stone", 9, 250);
    storage.setItem(PROFILE_KEY, JSON.stringify(other));

    store.refresh();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().skills).toEqual({ "Ice Stone": { level: 9 } });
  });

  it("refresh() does nothing when storage did not change", () => {
    const { storage } = memoryStorage();
    const store = createProfileStore(() => storage);
    store.update((p) => setSkillLevel(p, "Fire Slash", 5, 250));

    const listener = vi.fn();
    store.subscribe(listener);
    store.refresh();

    expect(listener).not.toHaveBeenCalled();
  });

  it("a null raw value (storage blocked) does not discard the cached profile", () => {
    const storage: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => undefined,
    };
    const store = createProfileStore(() => storage);
    store.update((p) => setSkillLevel(p, "Fire Slash", 5, 250));
    store.update((p) => setSkillLevel(p, "Ice Stone", 9, 250));

    expect(store.getSnapshot().skills).toEqual({
      "Fire Slash": { level: 5 },
      "Ice Stone": { level: 9 },
    });
  });
});

describe("this build must not destroy data from later versions", () => {
  it("applies changes in memory but never saves over a newer profile", () => {
    const raw = JSON.stringify({ version: 2, skills: { "Fire Slash": { level: 5 } } });
    const { data, storage } = memoryStorage();
    storage.setItem(PROFILE_KEY, raw);
    const store = createProfileStore(() => storage);

    store.update((p) => setSkillLevel(p, "Ice Stone", 9, 250));

    expect(store.getSnapshot().skills).toEqual({
      "Fire Slash": { level: 5 },
      "Ice Stone": { level: 9 },
    });
    expect(data.get(PROFILE_KEY)).toBe(raw);
    expect(data.has(UNREADABLE_KEY)).toBe(false);
  });
});
