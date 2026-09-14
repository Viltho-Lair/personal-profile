"use client";

import { useSyncExternalStore } from "react";
import * as rules from "./rules";
import { createProfileStore } from "./store";
import { PROFILE_KEY, type StorageLike } from "./storage";
import {
  emptyProfile,
  type EquippableKind,
  type FamiliarGroup,
  type GearKind,
  type PromotionRoll,
  type AbilityPreset,
  type OwnableKind,
  type PresetKind,
  type ProfileV1,
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
    setSpiritAwakening: (name: string, awakening: string | null) =>
      update((p) => rules.setSpiritAwakening(p, name, awakening)),
    setSpiritEnhance: (name: string, enhance: number) =>
      update((p) => rules.setSpiritEnhance(p, name, enhance)),
    setAwakening: (kind: GearKind, value: number, maxAwakening: number) =>
      update((p) => rules.setAwakening(p, kind, value, maxAwakening)),
    setSkillsAtMax: (on: boolean) => update((p) => rules.setSkillsAtMax(p, on)),
    setProficiencyLevel: (level: number, maxLevel: number) =>
      update((p) => rules.setProficiencyLevel(p, level, maxLevel)),
    selectSkillPreset: (index: number) => update((p) => rules.selectSkillPreset(p, index)),
    addToSkillPreset: (index: number, name: string) =>
      update((p) => rules.addToSkillPreset(p, index, name)),
    clearSkillPresetSlot: (index: number, slot: number) =>
      update((p) => rules.clearSkillPresetSlot(p, index, slot)),
    setMasteryLevel: (id: string, level: number, maxLevel: number) =>
      update((p) => rules.setMasteryLevel(p, id, level, maxLevel)),
    setMasteryPage: (nodes: readonly { id: string; maxLevel: number }[], full: boolean) =>
      update((p) => rules.setMasteryPage(p, nodes, full)),
    setFamiliarStars: (name: string, group: FamiliarGroup, stars: number | null) =>
      update((p) => rules.setFamiliarStars(p, name, group, stars)),
    equipFamiliar: (group: FamiliarGroup, name: string | null) =>
      update((p) => rules.equipFamiliar(p, group, name)),
    setCompanionAdvancement: (name: string, advancement: number, max: number) =>
      update((p) => rules.setCompanionAdvancement(p, name, advancement, max)),
    setCompanionSkillLevel: (name: string, skill: string, level: number, maxLevel: number) =>
      update((p) => rules.setCompanionSkillLevel(p, name, skill, level, maxLevel)),
    setCompanionPromotion: (name: string, slot: number, roll: Partial<PromotionRoll>) =>
      update((p) => rules.setCompanionPromotion(p, name, slot, roll)),
    setFamiliarProficiency: (kind: rules.ProficiencyKind, level: number) =>
      update((p) => rules.setFamiliarProficiency(p, kind, level)),
    setFountainEffect: (slot: number, effect: number) =>
      update((p) => rules.setFountainEffect(p, slot, effect)),
    updateCharacter: (change: (character: ProfileV1["character"]) => ProfileV1["character"]) =>
      update((p) => rules.updateCharacter(p, change)),
    selectPreset: (kind: PresetKind, index: number) => update((p) => rules.selectPreset(p, kind, index)),
    updateAbilityPreset: (change: (preset: AbilityPreset) => AbilityPreset) =>
      update((p) => rules.updateAbilityPreset(p, change)),
    setSpiritPresetSlot: (slot: number, name: string | null) =>
      update((p) => rules.setSpiritPresetSlot(p, slot, name)),
    toggleMainSpirit: (name: string) => update((p) => rules.toggleMainSpirit(p, name)),
    setSoulGem: (index: number, gem: Parameters<typeof rules.setSoulGem>[2]) =>
      update((p) => rules.setSoulGem(p, index, gem)),
    setChaos: (change: Parameters<typeof rules.setChaos>[1]) => update((p) => rules.setChaos(p, change)),
    placeSoulGem: (weapon: string, placement: Parameters<typeof rules.placeSoulGem>[2]) =>
      update((p) => rules.placeSoulGem(p, weapon, placement)),
    removeSoulGem: (weapon: string, gem: number | null) => update((p) => rules.removeSoulGem(p, weapon, gem)),
    setPlateCompleted: (weapon: string, on: boolean) => update((p) => rules.setPlateCompleted(p, weapon, on)),
    updateSkillStones: (change: Parameters<typeof rules.updateSkillStones>[1]) =>
      update((p) => rules.updateSkillStones(p, change)),
    setPromotionTarget: (change: Parameters<typeof rules.setPromotionTarget>[1]) =>
      update((p) => rules.setPromotionTarget(p, change)),
    setRefinementLine: (skill: string, index: number, change: Parameters<typeof rules.setRefinementLine>[3]) =>
      update((p) => rules.setRefinementLine(p, skill, index, change)),
    setOrbLevel: (level: number) => update((p) => rules.setOrbLevel(p, level)),
    updateOrbAccessory: (element: Parameters<typeof rules.updateOrbAccessory>[1], change: Parameters<typeof rules.updateOrbAccessory>[2]) =>
      update((p) => rules.updateOrbAccessory(p, element, change)),
    setBeast: (beast: string, change: Parameters<typeof rules.setBeast>[2]) => update((p) => rules.setBeast(p, beast, change)),
    setMountedBeast: (beast: string | null) => update((p) => rules.setMountedBeast(p, beast)),
    setPresetBeast: (beast: string | null) => update((p) => rules.setPresetBeast(p, beast)),
    setBeastMounted: (mounted: boolean) => update((p) => rules.setBeastMounted(p, mounted)),
    selectLoadout: (index: number) => update((p) => rules.selectLoadout(p, index)),
    setOutfitOwned: (group: Parameters<typeof rules.setOutfitOwned>[1], name: string, owned: boolean) =>
      update((p) => rules.setOutfitOwned(p, group, name, owned)),
    setShrineLevel: (statue: Parameters<typeof rules.setShrineLevel>[1], level: number, max: number) =>
      update((p) => rules.setShrineLevel(p, statue, level, max)),
    setIncludeSkills: (on: boolean) => update((p) => rules.setIncludeSkills(p, on)),
    setBossMonster: (on: boolean) => update((p) => rules.setBossMonster(p, on)),
    setEnemyElement: (element: ProfileV1["enemyElement"]) => update((p) => rules.setEnemyElement(p, element)),
    setStageFarming: (change: Partial<ProfileV1["stageFarming"]>) => update((p) => rules.setStageFarming(p, change)),
    resetProfile: () => update(() => emptyProfile()),
    replaceProfile: (next: ProfileV1) => update(() => next),
  };
}
