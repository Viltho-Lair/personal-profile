import type {
  EquippableKind,
  GearKind,
  GearState,
  KnownNames,
  OwnableKind,
  ProfileV1,
} from "./types";

const NO_GEAR: GearState = { owned: false, level: 0 };

/** Rule 5: whole levels between 0 and the item's current max. */
export function clampLevel(level: number, maxLevel: number | null): number {
  if (!Number.isFinite(level) || level < 0) return 0;
  const whole = Math.floor(level);
  return maxLevel === null ? whole : Math.min(whole, maxLevel);
}

function withGear(
  profile: ProfileV1,
  kind: GearKind,
  grade: string,
  state: GearState,
): ProfileV1 {
  return kind === "weapons"
    ? { ...profile, weapons: { ...profile.weapons, [grade]: state } }
    : { ...profile, accessories: { ...profile.accessories, [grade]: state } };
}

function withEquipped(
  profile: ProfileV1,
  kind: EquippableKind,
  key: string | null,
): ProfileV1 {
  switch (kind) {
    case "weapons":
      return { ...profile, equippedWeapon: key };
    case "accessories":
      return { ...profile, equippedAccessory: key };
    case "soulWeapons":
      return { ...profile, equippedSoulWeapon: key };
  }
}

export function equippedKey(
  profile: ProfileV1,
  kind: EquippableKind,
): string | null {
  switch (kind) {
    case "weapons":
      return profile.equippedWeapon;
    case "accessories":
      return profile.equippedAccessory;
    case "soulWeapons":
      return profile.equippedSoulWeapon;
  }
}

export function setSkillLevel(
  profile: ProfileV1,
  name: string,
  level: number,
  maxLevel: number,
): ProfileV1 {
  return {
    ...profile,
    skills: { ...profile.skills, [name]: { level: clampLevel(level, maxLevel) } },
  };
}

/** Rule 3: a level above 0 marks the gear owned. */
export function setGearLevel(
  profile: ProfileV1,
  kind: GearKind,
  grade: string,
  level: number,
  maxLevel: number,
): ProfileV1 {
  const clamped = clampLevel(level, maxLevel);
  const current = profile[kind][grade] ?? NO_GEAR;
  return withGear(profile, kind, grade, {
    owned: current.owned || clamped > 0,
    level: clamped,
  });
}

/** Rule 2: removing ownership unequips the item but keeps its level. */
export function setOwned(
  profile: ProfileV1,
  kind: OwnableKind,
  key: string,
  owned: boolean,
): ProfileV1 {
  if (kind === "spirits") {
    const current = profile.spirits[key] ?? NO_GEAR;
    return { ...profile, spirits: { ...profile.spirits, [key]: { ...current, owned } } };
  }

  const next =
    kind === "soulWeapons"
      ? { ...profile, soulWeapons: { ...profile.soulWeapons, [key]: { owned } } }
      : withGear(profile, kind, key, { ...(profile[kind][key] ?? NO_GEAR), owned });

  return !owned && equippedKey(next, kind) === key
    ? withEquipped(next, kind, null)
    : next;
}

/** Rule 1: equipping marks the item owned. `null` unequips. */
export function equip(
  profile: ProfileV1,
  kind: EquippableKind,
  key: string | null,
): ProfileV1 {
  if (key === null) return withEquipped(profile, kind, null);
  return withEquipped(setOwned(profile, kind, key, true), kind, key);
}

/** Rule 4: a relic has no owned flag; level 0 means not owned. */
export function setRelicLevel(
  profile: ProfileV1,
  name: string,
  level: number,
  maxLevel: number,
): ProfileV1 {
  return {
    ...profile,
    relics: { ...profile.relics, [name]: { level: clampLevel(level, maxLevel) } },
  };
}

/** Rule 3 also applies to spirits. */
export function setSpiritLevel(
  profile: ProfileV1,
  name: string,
  level: number,
  maxLevel: number | null,
): ProfileV1 {
  const clamped = clampLevel(level, maxLevel);
  const current = profile.spirits[name] ?? NO_GEAR;
  return {
    ...profile,
    spirits: {
      ...profile.spirits,
      [name]: { owned: current.owned || clamped > 0, level: clamped },
    },
  };
}

export function skillLevel(profile: ProfileV1, name: string, maxLevel: number): number {
  return clampLevel(profile.skills[name]?.level ?? 0, maxLevel);
}

export function gearState(
  profile: ProfileV1,
  kind: GearKind,
  grade: string,
  maxLevel: number,
): GearState {
  const state = profile[kind][grade] ?? NO_GEAR;
  return { owned: state.owned, level: clampLevel(state.level, maxLevel) };
}

export function relicLevel(profile: ProfileV1, name: string, maxLevel: number): number {
  return clampLevel(profile.relics[name]?.level ?? 0, maxLevel);
}

export function spiritState(
  profile: ProfileV1,
  name: string,
  maxLevel: number | null,
): { owned: boolean; level: number } {
  const state = profile.spirits[name] ?? NO_GEAR;
  return { owned: state.owned, level: clampLevel(state.level, maxLevel) };
}

export function soulWeaponOwned(profile: ProfileV1, name: string): boolean {
  return profile.soulWeapons[name]?.owned ?? false;
}

/** Rule 6: entries whose names the current data no longer has. */
export function unknownEntries(profile: ProfileV1, known: KnownNames): string[] {
  const kinds = ["skills", "weapons", "accessories", "relics", "spirits", "soulWeapons"] as const;
  return kinds.flatMap((kind) => {
    const names = new Set(known[kind]);
    return Object.keys(profile[kind])
      .filter((name) => !names.has(name))
      .map((name) => `${kind}: ${name}`);
  });
}
