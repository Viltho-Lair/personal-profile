import characterData from "@/data/optimizer/character.json";
import { awakenedClassName } from "@/lib/game/character";
import { gearEffects } from "@/lib/game/formulas";
import { awakening, clampLevel, gearState } from "@/lib/profile/rules";
import type { GearKind, ProfileV1 } from "@/lib/profile/types";
import { ACCESSORIES, AWAKENING, GEAR_LEVEL_FACTORS, IMMORTAL_ART, MAX_AWAKENING, WEAPONS, type Gear } from "./data";
import { classLevelCap, classTotals, gearTotals } from "./stat-sources";
import { gearRarity } from "./tiers";

const CLASSES = characterData.classes as { name: string; multiplier: number; icon: string | null; iconSize: number | null }[];
const CLASS_BY_NAME = new Map(CLASSES.map((cls) => [cls.name, cls]));
/** Blast, Tera and Seed are the last class before it awakens further: only the last entry is owned. */
const HIDDEN_CLASSES = new Set(CLASSES.slice(-4, -1).map((cls) => cls.name));

export type EquipKind = GearKind | "class";

/** An owned weapon, accessory or class whose equip effect beats the one equipped. */
export type BetterEquipment = {
  kind: EquipKind;
  /** The grade ("Mythic 1") or class name to equip. */
  key: string;
  /** What the game writes on its art: the rarity for gear ("Ancient"), the grade for a class ("23 grade"). */
  label: string;
  /** Rarity colour tier; null for a class. */
  rarity: string | null;
  icon: string | null;
  iconSize: number | null;
  equip: number;
};

/** Better Weapon, Better Accessories, Better Class: the game's order, top to bottom. */
export const EQUIP_KINDS: readonly EquipKind[] = ["weapons", "accessories", "class"];

type Choose = "best" | "lowest";

/** Whether the effect wins the search: the strongest owned, or the weakest (what Rage wants). */
const wins = (pick: Choose, best: BetterEquipment | null, effect: number) =>
  !best || (pick === "best" ? effect > best.equip : effect < best.equip);

/** The owned weapon or accessory with the highest (or lowest) equip effect. */
export function pickGear(profile: ProfileV1, kind: GearKind, list: readonly Gear[], pick: Choose): BetterEquipment | null {
  const count = awakening(profile, kind, MAX_AWAKENING);
  const row = AWAKENING[count];
  let found: BetterEquipment | null = null;
  for (const gear of list) {
    const state = gearState(profile, kind, gear.grade, gear.maxLevel);
    if (!state.owned) continue;
    const awakened = gear.tier === "Immortal" && row ? (kind === "weapons" ? row.weaponMultiplier : row.accessoryMultiplier) : 1;
    const { equip: effect } = gearEffects(gear.multiplier, GEAR_LEVEL_FACTORS, state.level, awakened);
    if (!wins(pick, found, effect)) continue;
    const rarity = gearRarity(gear.tier, count);
    const art = gear.tier === "Immortal" ? [...IMMORTAL_ART[kind]].reverse().find((entry) => count >= entry.from) : null;
    found = {
      kind,
      key: gear.grade,
      label: gear.tier === "Immortal" ? rarity : gear.grade,
      rarity,
      icon: art?.icon ?? gear.icon,
      iconSize: art?.iconSize ?? gear.iconSize,
      equip: effect,
    };
  }
  return found;
}

/** The owned class with the highest (or lowest) equip effect. */
export function pickClass(profile: ProfileV1, pick: Choose): BetterEquipment | null {
  const c = profile.character;
  const max = classLevelCap(c);
  let found: BetterEquipment | null = null;
  CLASSES.forEach((cls, index) => {
    const state = c.classes[cls.name];
    if (!state?.owned || HIDDEN_CLASSES.has(cls.name)) return;
    const isLast = index === CLASSES.length - 1;
    const multiplier = isLast ? (AWAKENING[c.classAwakening]?.blastMultiplier ?? 1) : 1;
    const { equip: effect } = gearEffects(cls.multiplier, GEAR_LEVEL_FACTORS, clampLevel(state.level, max), multiplier);
    if (!wins(pick, found, effect)) return;
    const art = isLast ? (CLASS_BY_NAME.get(awakenedClassName(c.classAwakening)) ?? cls) : cls;
    found = { kind: "class", key: cls.name, label: `${index + 1} grade`, rarity: null, icon: art.icon, iconSize: art.iconSize, equip: effect };
  });
  return found as BetterEquipment | null;
}

/** What could be equipped for more: the best owned weapon, accessory and class, where each beats the equipped one. */
export function betterEquipment(profile: ProfileV1): BetterEquipment[] {
  const better = (item: BetterEquipment | null, equipped: number) => (item && item.equip > equipped ? item : null);
  return [
    better(pickGear(profile, "weapons", WEAPONS, "best"), gearTotals(profile, "weapons", WEAPONS).equip),
    better(pickGear(profile, "accessories", ACCESSORIES, "best"), gearTotals(profile, "accessories", ACCESSORIES).equip),
    better(pickClass(profile, "best"), classTotals(profile.character).equip),
  ].filter((item): item is BetterEquipment => item !== null);
}

/**
 * The weakest owned weapon and class, to drop to before Rage: each is null when nothing is owned or the weakest is
 * already equipped.
 */
export function lowestEquipment(profile: ProfileV1) {
  const weapon = pickGear(profile, "weapons", WEAPONS, "lowest");
  const cls = pickClass(profile, "lowest");
  return {
    weapon: weapon && weapon.key !== profile.equippedWeapon ? weapon : null,
    class: cls && cls.key !== profile.character.equippedClass ? cls : null,
  };
}
