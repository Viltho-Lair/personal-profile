"use client";

import { useSyncExternalStore } from "react";
import * as rules from "./rules";
import { createProfileStore } from "./store";
import { PROFILE_KEY, type StorageLike } from "./storage";
import {
  emptyProfile,
  type EquippableKind,
  type GearKind,
  type OwnableKind,
} from "./types";

function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const store = createProfileStore(browserStorage);
const SERVER_PROFILE = emptyProfile();

// Registered lazily, the first time anything subscribes, and only once: a
// `storage` event fires in every other tab on the same origin when one tab
// changes localStorage, so this is how a stale tab hears about a fresher
// profile saved elsewhere.
let storageListenerRegistered = false;

function ensureStorageListener() {
  if (storageListenerRegistered || typeof window === "undefined") return;
  storageListenerRegistered = true;
  window.addEventListener("storage", (event) => {
    if (event.key === PROFILE_KEY || event.key === null) store.refresh();
  });
}

function subscribe(listener: () => void) {
  ensureStorageListener();
  return store.subscribe(listener);
}

type Levelled = { name: string; maxLevel: number };

/** The player's profile and every action that changes it. */
export function useProfile() {
  const profile = useSyncExternalStore(
    subscribe,
    store.getSnapshot,
    () => SERVER_PROFILE,
  );
  const { update } = store;

  return {
    profile,
    setSkillLevel: (name: string, level: number, maxLevel: number) =>
      update((p) => rules.setSkillLevel(p, name, level, maxLevel)),
    setGearLevel: (kind: GearKind, grade: string, level: number, maxLevel: number) =>
      update((p) => rules.setGearLevel(p, kind, grade, level, maxLevel)),
    setOwned: (kind: OwnableKind, key: string, owned: boolean) =>
      update((p) => rules.setOwned(p, kind, key, owned)),
    equip: (kind: EquippableKind, key: string | null) =>
      update((p) => rules.equip(p, kind, key)),
    setRelicLevel: (name: string, level: number, maxLevel: number) =>
      update((p) => rules.setRelicLevel(p, name, level, maxLevel)),
    setAllRelicLevels: (items: Levelled[], level: number) =>
      update((p) =>
        items.reduce((acc, item) => rules.setRelicLevel(acc, item.name, level, item.maxLevel), p),
      ),
    setSpiritLevel: (name: string, level: number, maxLevel: number) =>
      update((p) => rules.setSpiritLevel(p, name, level, maxLevel)),
    setSkillsAtMax: (on: boolean) => update((p) => rules.setSkillsAtMax(p, on)),
    setProficiencyLevel: (level: number, maxLevel: number) =>
      update((p) => rules.setProficiencyLevel(p, level, maxLevel)),
    selectSkillPreset: (index: number) => update((p) => rules.selectSkillPreset(p, index)),
    addToSkillPreset: (index: number, name: string) =>
      update((p) => rules.addToSkillPreset(p, index, name)),
    clearSkillPresetSlot: (index: number, slot: number) =>
      update((p) => rules.clearSkillPresetSlot(p, index, slot)),
    resetProfile: () => update(() => emptyProfile()),
  };
}
