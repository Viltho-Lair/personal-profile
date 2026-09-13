import {
  SKILL_PRESET_COUNT,
  type EquippableKind,
  type GearKind,
  type GearState,
  type KnownNames,
  type OwnableKind,
  type ProfileV1,
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

/** The level a skill counts as: its max while "Max skills" is on. */
export function effectiveSkillLevel(profile: ProfileV1, name: string, maxLevel: number): number {
  return profile.skillsAtMax ? maxLevel : skillLevel(profile, name, maxLevel);
}

export function setSkillsAtMax(profile: ProfileV1, skillsAtMax: boolean): ProfileV1 {
  return { ...profile, skillsAtMax };
}

export function proficiencyLevel(profile: ProfileV1, maxLevel: number): number {
  return clampLevel(profile.proficiencyLevel, maxLevel);
}

export function setProficiencyLevel(profile: ProfileV1, level: number, maxLevel: number): ProfileV1 {
  return { ...profile, proficiencyLevel: clampLevel(level, maxLevel) };
}

export function selectSkillPreset(profile: ProfileV1, index: number): ProfileV1 {
  const valid = Number.isInteger(index) && index >= 0 && index < SKILL_PRESET_COUNT;
  return { ...profile, activeSkillPreset: valid ? index : 0 };
}

function withPreset(profile: ProfileV1, index: number, slots: (string | null)[]): ProfileV1 {
  return {
    ...profile,
    skillPresets: profile.skillPresets.map((preset, i) => (i === index ? slots : preset)),
  };
}

/** Puts a skill in the preset's first empty slot. A skill appears once; a full preset is unchanged. */
export function addToSkillPreset(profile: ProfileV1, index: number, name: string): ProfileV1 {
  const slots = profile.skillPresets[index];
  if (!slots || slots.includes(name)) return profile;
  const empty = slots.indexOf(null);
  if (empty === -1) return profile;
  return withPreset(profile, index, slots.map((slot, i) => (i === empty ? name : slot)));
}

export function clearSkillPresetSlot(profile: ProfileV1, index: number, slot: number): ProfileV1 {
  const slots = profile.skillPresets[index];
  if (!slots || slots[slot] == null) return profile;
  return withPreset(profile, index, slots.map((name, i) => (i === slot ? null : name)));
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

const EQUIPPED_FIELDS = [
  { field: "equippedWeapon", known: "weapons" },
  { field: "equippedAccessory", known: "accessories" },
  { field: "equippedSoulWeapon", known: "soulWeapons" },
] as const satisfies readonly { field: keyof ProfileV1; known: keyof KnownNames }[];

/** Rule 6: entries whose names the current data no longer has. */
export function unknownEntries(profile: ProfileV1, known: KnownNames): string[] {
  const kinds = ["skills", "weapons", "accessories", "relics", "spirits", "soulWeapons"] as const;
  const stored = kinds.flatMap((kind) => {
    const names = new Set(known[kind]);
    return Object.keys(profile[kind])
      .filter((name) => !names.has(name))
      .map((name) => `${kind}: ${name}`);
  });

  // An equipped item can itself be unknown even when the gear/soul-weapon
  // entry that owns it is still recognized (or absent) - e.g. after only the
  // equipped grade was renamed. No auto-fixing on load: this only reports it.
  const equipped = EQUIPPED_FIELDS.flatMap(({ field, known: knownKind }) => {
    const equippedName = profile[field];
    if (typeof equippedName !== "string") return [];
    return known[knownKind].includes(equippedName) ? [] : [`${field}: ${equippedName}`];
  });

  const knownSkills = new Set(known.skills);
  const presets = [...new Set(profile.skillPresets.flat())]
    .filter((name): name is string => name !== null && !knownSkills.has(name))
    .map((name) => `skillPresets: ${name}`);

  return [...stored, ...equipped, ...presets];
}
