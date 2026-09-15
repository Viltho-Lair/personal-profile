import characterData from "@/data/optimizer/character.json";
import { awakenedClassName } from "@/lib/game/character";
import { gearEffects } from "@/lib/game/formulas";
import { awakening, clampLevel, equip, gearState, updateCharacter } from "@/lib/profile/rules";
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

function betterGear(profile: ProfileV1, kind: GearKind, list: readonly Gear[]): BetterEquipment | null {
  const count = awakening(profile, kind, MAX_AWAKENING);
  const row = AWAKENING[count];
  let best: BetterEquipment | null = null;
  for (const gear of list) {
    const state = gearState(profile, kind, gear.grade, gear.maxLevel);
    if (!state.owned) continue;
    const awakened = gear.tier === "Immortal" && row ? (kind === "weapons" ? row.weaponMultiplier : row.accessoryMultiplier) : 1;
    const { equip: effect } = gearEffects(gear.multiplier, GEAR_LEVEL_FACTORS, state.level, awakened);
    if (best && effect <= best.equip) continue;
    const rarity = gearRarity(gear.tier, count);
    const art = gear.tier === "Immortal" ? [...IMMORTAL_ART[kind]].reverse().find((entry) => count >= entry.from) : null;
    best = {
      kind,
      key: gear.grade,
      label: gear.tier === "Immortal" ? rarity : gear.grade,
      rarity,
      icon: art?.icon ?? gear.icon,
      iconSize: art?.iconSize ?? gear.iconSize,
      equip: effect,
    };
  }
  return best && best.equip > gearTotals(profile, kind, list).equip ? best : null;
}

function betterClass(profile: ProfileV1): BetterEquipment | null {
  const c = profile.character;
  const max = classLevelCap(c);
  let best: BetterEquipment | null = null;
  CLASSES.forEach((cls, index) => {
    const state = c.classes[cls.name];
    if (!state?.owned || HIDDEN_CLASSES.has(cls.name)) return;
    const isLast = index === CLASSES.length - 1;
    const multiplier = isLast ? (AWAKENING[c.classAwakening]?.blastMultiplier ?? 1) : 1;
    const { equip: effect } = gearEffects(cls.multiplier, GEAR_LEVEL_FACTORS, clampLevel(state.level, max), multiplier);
    if (best && effect <= best.equip) return;
    const art = isLast ? (CLASS_BY_NAME.get(awakenedClassName(c.classAwakening)) ?? cls) : cls;
    best = { kind: "class", key: cls.name, label: `${index + 1} grade`, rarity: null, icon: art.icon, iconSize: art.iconSize, equip: effect };
  });
  const found = best as BetterEquipment | null;
  return found && found.equip > classTotals(c).equip ? found : null;
}

/** What could be equipped for more: the best owned weapon, accessory and class, where each beats the equipped one. */
export function betterEquipment(profile: ProfileV1): BetterEquipment[] {
  return [betterGear(profile, "weapons", WEAPONS), betterGear(profile, "accessories", ACCESSORIES), betterClass(profile)].filter(
    (item): item is BetterEquipment => item !== null,
  );
}

/** The profile with that item equipped. */
export function equipBetter(profile: ProfileV1, item: BetterEquipment): ProfileV1 {
  return item.kind === "class" ? updateCharacter(profile, (c) => ({ ...c, equippedClass: item.key })) : equip(profile, item.kind, item.key);
}
