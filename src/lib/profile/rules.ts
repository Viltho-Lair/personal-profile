import type { SkillStoneSet } from "@/lib/game/battle";
import type { GemPlacement, SoulGem } from "@/lib/game/engraving";
import {
  emptyCompanion,
  FIRST_SPIRIT_TIER,
  MAIN_SPIRIT_COUNT,
  MAX_FAMILIAR_STARS,
  PRESET_COUNT,
  SPIRIT_PRESET_SLOTS,
  type AbilityPreset,
  type SoulEngraving,
  type FamiliarPreset,
  type PresetKind,
  MAX_SPIRIT_ENHANCE,
  MIN_SPIRIT_ENHANCE,
  SKILL_PRESET_COUNT,
  type CompanionState,
  type EquippableKind,
  type FamiliarGroup,
  type PromotionRoll,
  type GearKind,
  type GearState,
  type KnownNames,
  type OwnableKind,
  type ProfileV1,
  type SpiritState,
} from "./types";

const NO_GEAR: GearState = { owned: false, level: 0 };
const NO_SPIRIT: SpiritState = { owned: false, level: 0, awakening: null, enhance: MIN_SPIRIT_ENHANCE };

function withSpirit(profile: ProfileV1, name: string, state: SpiritState): ProfileV1 {
  return { ...profile, spirits: { ...profile.spirits, [name]: state } };
}

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
    const current = profile.spirits[key] ?? NO_SPIRIT;
    const awakening = owned ? (current.awakening ?? FIRST_SPIRIT_TIER) : null;
    return withSpirit(profile, key, { ...current, owned, awakening });
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

/** Rule 3 also applies to spirits: a level above 0 owns it, at the first tier if it had none. */
export function setSpiritLevel(
  profile: ProfileV1,
  name: string,
  level: number,
  maxLevel: number | null,
): ProfileV1 {
  const clamped = clampLevel(level, maxLevel);
  const current = profile.spirits[name] ?? NO_SPIRIT;
  const awakening = current.awakening ?? (clamped > 0 ? FIRST_SPIRIT_TIER : null);
  return withSpirit(profile, name, { ...current, owned: awakening !== null, level: clamped, awakening });
}

/** The awakening tier owns the spirit; `null` means not owned (its level and enhance are kept). */
export function setSpiritAwakening(profile: ProfileV1, name: string, awakening: string | null): ProfileV1 {
  const current = profile.spirits[name] ?? NO_SPIRIT;
  const updated = withSpirit(profile, name, { ...current, owned: awakening !== null, awakening });
  // A spirit that's no longer owned can't stay in the main six.
  return awakening === null ? { ...updated, mainSpirits: updated.mainSpirits.filter((n) => n !== name) } : updated;
}

/** Enhance is the spirit's skill level: 1 when owned, up to 5. */
export function setSpiritEnhance(profile: ProfileV1, name: string, enhance: number): ProfileV1 {
  const current = profile.spirits[name] ?? NO_SPIRIT;
  const whole = Number.isFinite(enhance) ? Math.floor(enhance) : MIN_SPIRIT_ENHANCE;
  return withSpirit(profile, name, {
    ...current,
    enhance: Math.min(MAX_SPIRIT_ENHANCE, Math.max(MIN_SPIRIT_ENHANCE, whole)),
  });
}

export function companionState(profile: ProfileV1, name: string): CompanionState {
  return profile.companions[name] ?? emptyCompanion();
}

function withCompanion(profile: ProfileV1, name: string, change: (state: CompanionState) => CompanionState): ProfileV1 {
  return { ...profile, companions: { ...profile.companions, [name]: change(companionState(profile, name)) } };
}

export function setCompanionAdvancement(profile: ProfileV1, name: string, advancement: number, max: number): ProfileV1 {
  return withCompanion(profile, name, (state) => ({ ...state, advancement: clampLevel(advancement, max) }));
}

export function setCompanionSkillLevel(
  profile: ProfileV1,
  name: string,
  skill: string,
  level: number,
  maxLevel: number,
): ProfileV1 {
  return withCompanion(profile, name, (state) => ({
    ...state,
    skills: { ...state.skills, [skill]: clampLevel(level, maxLevel) },
  }));
}

export function setCompanionPromotion(
  profile: ProfileV1,
  name: string,
  slot: number,
  roll: Partial<PromotionRoll>,
): ProfileV1 {
  return withCompanion(profile, name, (state) => ({
    ...state,
    promotion: state.promotion.map((current, i) => (i === slot ? { ...current, ...roll } : current)),
  }));
}

/** Applies a change to the character settings. The caller keeps values in range. */
export function updateCharacter(
  profile: ProfileV1,
  change: (character: ProfileV1["character"]) => ProfileV1["character"],
): ProfileV1 {
  return { ...profile, character: change(profile.character) };
}

export type ProficiencyKind = keyof ProfileV1["familiarProficiency"];

export function setFamiliarProficiency(profile: ProfileV1, kind: ProficiencyKind, level: number): ProfileV1 {
  return { ...profile, familiarProficiency: { ...profile.familiarProficiency, [kind]: clampLevel(level, null) } };
}

/** `effect` is a fraction (0.05 = 5%); negative or invalid input becomes 0. */
export function setFountainEffect(profile: ProfileV1, slot: number, effect: number): ProfileV1 {
  const safe = Number.isFinite(effect) && effect > 0 ? effect : 0;
  return {
    ...profile,
    fountainEffects: profile.fountainEffects.map((current, i) => (i === slot ? safe : current)),
  };
}

export function awakening(profile: ProfileV1, kind: GearKind, maxAwakening: number): number {
  return clampLevel(kind === "weapons" ? profile.weaponAwakening : profile.accessoryAwakening, maxAwakening);
}

/** Awakening raises the max level of every grade of that gear. */
export function setAwakening(profile: ProfileV1, kind: GearKind, value: number, maxAwakening: number): ProfileV1 {
  const clamped = clampLevel(value, maxAwakening);
  return kind === "weapons"
    ? { ...profile, weaponAwakening: clamped }
    : { ...profile, accessoryAwakening: clamped };
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

export function masteryLevel(profile: ProfileV1, id: string, maxLevel: number): number {
  return clampLevel(profile.masteryNodes[id]?.level ?? 0, maxLevel);
}

export function setMasteryLevel(profile: ProfileV1, id: string, level: number, maxLevel: number): ProfileV1 {
  return {
    ...profile,
    masteryNodes: { ...profile.masteryNodes, [id]: { level: clampLevel(level, maxLevel) } },
  };
}

type MasteryNodeRef = { id: string; maxLevel: number };

/** Sets every node on a page at once, to fill or clear it. */
export function setMasteryPage(profile: ProfileV1, nodes: readonly MasteryNodeRef[], full: boolean): ProfileV1 {
  const masteryNodes = { ...profile.masteryNodes };
  for (const node of nodes) masteryNodes[node.id] = { level: full ? node.maxLevel : 0 };
  return { ...profile, masteryNodes };
}

/** A page is filled when every node on it is at its max level. */
export function isMasteryPageComplete(profile: ProfileV1, nodes: readonly MasteryNodeRef[]): boolean {
  return nodes.every((node) => masteryLevel(profile, node.id, node.maxLevel) >= node.maxLevel);
}

/** How many pages are open: page 1 always, each later page once the one before is filled. */
export function openMasteryPages(
  profile: ProfileV1,
  pages: readonly { nodes: readonly MasteryNodeRef[] }[],
): number {
  let open = pages.length > 0 ? 1 : 0;
  while (open < pages.length && isMasteryPageComplete(profile, pages[open - 1].nodes)) open += 1;
  return open;
}

/** Stars for an owned familiar, or null when it isn't owned. */
export function familiarStars(profile: ProfileV1, name: string): number | null {
  const entry = profile.familiars[name];
  return entry ? clampLevel(entry.stars, MAX_FAMILIAR_STARS) : null;
}

/** `null` stars removes the familiar and unequips it. */
export function setFamiliarStars(
  profile: ProfileV1,
  name: string,
  group: FamiliarGroup,
  stars: number | null,
): ProfileV1 {
  const familiars = { ...profile.familiars };
  if (stars === null) {
    delete familiars[name];
    const presetFamiliars = profile.presets.familiars.map((preset) =>
      preset[group] === name ? { ...preset, [group]: null } : preset,
    );
    return { ...profile, familiars, presets: { ...profile.presets, familiars: presetFamiliars } };
  }
  familiars[name] = { stars: clampLevel(stars, MAX_FAMILIAR_STARS) };
  return { ...profile, familiars };
}

/** Equipping marks the familiar owned (at 0 stars if it wasn't). `null` empties the group's slot. */
export function equipFamiliar(profile: ProfileV1, group: FamiliarGroup, name: string | null): ProfileV1 {
  const owned =
    name === null || profile.familiars[name] ? profile : setFamiliarStars(profile, name, group, 0);
  const index = owned.activePresets.familiars;
  const familiars = owned.presets.familiars.map((preset, i) => (i === index ? { ...preset, [group]: name } : preset));
  return { ...owned, presets: { ...owned.presets, familiars } };
}

/** The familiars equipped by the active familiar preset. */
export function activeFamiliars(profile: ProfileV1): FamiliarPreset {
  return profile.presets.familiars[profile.activePresets.familiars] ?? { weapon: null, attribute: null, battle: null };
}

export function selectPreset(profile: ProfileV1, kind: PresetKind, index: number): ProfileV1 {
  const valid = Number.isInteger(index) && index >= 0 && index < PRESET_COUNT;
  return { ...profile, activePresets: { ...profile.activePresets, [kind]: valid ? index : 0 } };
}

export function activeAbilityPreset(profile: ProfileV1): AbilityPreset {
  return profile.presets.abilities[profile.activePresets.abilities] ?? profile.presets.abilities[0];
}

export function updateAbilityPreset(profile: ProfileV1, change: (preset: AbilityPreset) => AbilityPreset): ProfileV1 {
  const index = profile.activePresets.abilities;
  const abilities = profile.presets.abilities.map((preset, i) => (i === index ? change(preset) : preset));
  return { ...profile, presets: { ...profile.presets, abilities } };
}

export function activeSpiritPreset(profile: ProfileV1): (string | null)[] {
  return profile.presets.spirits[profile.activePresets.spirits] ?? Array<string | null>(SPIRIT_PRESET_SLOTS).fill(null);
}

/** Puts a spirit in a slot of the active spirit preset; a spirit already in another slot moves. */
export function setSpiritPresetSlot(profile: ProfileV1, slot: number, name: string | null): ProfileV1 {
  if (!Number.isInteger(slot) || slot < 0 || slot >= SPIRIT_PRESET_SLOTS) return profile;
  const index = profile.activePresets.spirits;
  const spirits = profile.presets.spirits.map((preset, i) =>
    i === index ? preset.map((current, s) => (s === slot ? name : current === name ? null : current)) : preset,
  );
  return { ...profile, presets: { ...profile.presets, spirits } };
}

/** Marks or unmarks a main spirit; a seventh can't be added. */
export function toggleMainSpirit(profile: ProfileV1, name: string): ProfileV1 {
  if (profile.mainSpirits.includes(name)) {
    return { ...profile, mainSpirits: profile.mainSpirits.filter((n) => n !== name) };
  }
  if (profile.mainSpirits.length >= MAIN_SPIRIT_COUNT) return profile;
  return { ...profile, mainSpirits: [...profile.mainSpirits, name] };
}

/**
 * The level a spirit counts at. Once six main spirits are set, every other
 * spirit carries the lowest main spirit level.
 */
export function effectiveSpiritLevel(profile: ProfileV1, name: string, maxLevel: number | null): number {
  const own = spiritState(profile, name, maxLevel).level;
  const lineup = spiritLineup(profile, maxLevel);
  if (!lineup || profile.mainSpirits.includes(name)) return own;
  return lineup.level;
}

/**
 * The main six's lineup level: the lowest level among the six main spirits,
 * once all six are owned. `null` until then.
 */
export function spiritLineup(profile: ProfileV1, maxLevel: number | null): { level: number; lowest: string } | null {
  const mains = profile.mainSpirits.map((name) => ({ name, state: spiritState(profile, name, maxLevel) }));
  if (mains.length < MAIN_SPIRIT_COUNT || mains.some((main) => !main.state.owned)) return null;
  const lowest = mains.reduce((low, main) => (main.state.level < low.state.level ? main : low));
  return { level: lowest.state.level, lowest: lowest.name };
}

function withEngraving(profile: ProfileV1, change: (engraving: SoulEngraving) => SoulEngraving): ProfileV1 {
  return { ...profile, soulEngraving: change(profile.soulEngraving) };
}

/** Sets or clears one of the eight soul gems; a gem that changes shape or goes away leaves every plate. */
export function setSoulGem(profile: ProfileV1, index: number, gem: SoulGem | null): ProfileV1 {
  if (!Number.isInteger(index) || index < 0 || index >= profile.soulEngraving.gems.length) return profile;
  return withEngraving(profile, (e) => {
    const before = e.gems[index];
    const reshaped = !gem || !before || before.shape !== gem.shape;
    return {
      ...e,
      gems: e.gems.map((g, i) => (i === index ? gem : g)),
      plates: reshaped
        ? Object.fromEntries(Object.entries(e.plates).map(([w, ps]) => [w, ps.filter((p) => p.gem !== index)]))
        : e.plates,
    };
  });
}

export function setChaos(profile: ProfileV1, change: Partial<Pick<SoulEngraving, "chaosLevel" | "chaosBonus">>): ProfileV1 {
  return withEngraving(profile, (e) => ({ ...e, ...change }));
}

/** Puts a gem on a weapon's plate, moving it if it was already there. The caller checks it fits. */
export function placeSoulGem(profile: ProfileV1, weapon: string, placement: GemPlacement): ProfileV1 {
  return withEngraving(profile, (e) => ({
    ...e,
    plates: { ...e.plates, [weapon]: [...(e.plates[weapon] ?? []).filter((p) => p.gem !== placement.gem), placement] },
  }));
}

/** Takes one gem off a weapon's plate, or every gem when `gem` is null. */
export function removeSoulGem(profile: ProfileV1, weapon: string, gem: number | null): ProfileV1 {
  return withEngraving(profile, (e) => ({
    ...e,
    plates: { ...e.plates, [weapon]: gem === null ? [] : (e.plates[weapon] ?? []).filter((p) => p.gem !== gem) },
  }));
}

export function setPlateCompleted(profile: ProfileV1, weapon: string, on: boolean): ProfileV1 {
  return withEngraving(profile, (e) => {
    const completed = { ...e.completed };
    if (on) completed[weapon] = true;
    else delete completed[weapon];
    return { ...e, completed };
  });
}

/** Changes the active skill stone preset. */
export function updateSkillStones(profile: ProfileV1, change: (stones: SkillStoneSet) => SkillStoneSet): ProfileV1 {
  const index = profile.activePresets.skillStones;
  const skillStones = profile.presets.skillStones.map((set, i) => (i === index ? change(set) : set));
  return { ...profile, presets: { ...profile.presets, skillStones } };
}

export function activeSkillStones(profile: ProfileV1): SkillStoneSet {
  return profile.presets.skillStones[profile.activePresets.skillStones] ?? { cooldown: null, time: null, heat: null };
}

export function setPromotionTarget(profile: ProfileV1, change: Partial<ProfileV1["promotionTarget"]>): ProfileV1 {
  return { ...profile, promotionTarget: { ...profile.promotionTarget, ...change } };
}

export function setIncludeSkills(profile: ProfileV1, includeSkills: boolean): ProfileV1 {
  return { ...profile, includeSkills };
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

export function spiritState(profile: ProfileV1, name: string, maxLevel: number | null): SpiritState {
  const state = profile.spirits[name] ?? NO_SPIRIT;
  return { ...state, level: clampLevel(state.level, maxLevel) };
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

  const missing = (names: string[] | undefined, kind: string, keys: string[]) =>
    names ? [...new Set(keys)].filter((key) => !names.includes(key)).map((key) => `${kind}: ${key}`) : [];
  const mastery = missing(known.masteryNodes, "masteryNodes", Object.keys(profile.masteryNodes));
  const familiars = missing(known.familiars, "familiars", [
    ...Object.keys(profile.familiars),
    ...profile.presets.familiars.flatMap((preset) => Object.values(preset)).filter((n): n is string => n !== null),
  ]);
  const spirits = missing(known.spirits, "spiritPresets", [
    ...profile.presets.spirits.flat().filter((n): n is string => n !== null),
    ...profile.mainSpirits,
  ]);

  return [...stored, ...equipped, ...presets, ...mastery, ...familiars, ...spirits];
}
