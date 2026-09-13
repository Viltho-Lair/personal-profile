import { describe, expect, it, vi } from "vitest";
import { setSkillLevel } from "./rules";
import { createProfileStore } from "./store";
import { PROFILE_KEY, type StorageLike } from "./storage";
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
