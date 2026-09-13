import accessoriesData from "@/data/optimizer/accessories.json";
import gearLevelsData from "@/data/optimizer/gear-levels.json";
import relicsData from "@/data/optimizer/relics.json";
import skillsData from "@/data/optimizer/skills.json";
import soulWeaponsData from "@/data/optimizer/soul-weapons.json";
import spiritsData from "@/data/optimizer/spirits.json";
import weaponsData from "@/data/optimizer/weapons.json";
import type { Band } from "@/lib/game/formulas";
import type { KnownNames } from "@/lib/profile/types";

export const GRADE_ORDER = ["Common", "Great", "Rare", "Epic", "Legendary", "Mythic", "Immortal"] as const;
export const ELEMENTS = ["Fire", "Water", "Wind", "Earth"] as const;

type Art = { icon: string | null; iconSize: number | null };

export type Skill = Art & {
  id: number;
  name: string;
  element: string | null;
  grade: string;
  maxLevel: number;
  mpCost: number | null;
  baseValue: number | null;
  upgradeValue: number | null;
  cooldown: number | null;
  range: number | null;
  duration: number | null;
  description: { basic: string | null; specific: string | null };
};

export type Gear = Art & {
  grade: string;
  tier: string;
  gradeNumber: number | null;
  tierRank: number | null;
  multiplier: number;
  baseMaxLevel: number;
  maxLevel: number;
  secondary: Record<string, number | null>;
};

export type Relic = Art & {
  id: number;
  name: string;
  buff: string | null;
  percent: boolean;
  maxLevel: number;
  bands: Band[];
};

export type Spirit = Art & {
  id: number;
  name: string;
  maxLevel: number;
  element: string | null;
  skill: {
    name: string | null;
    description: string | null;
    type: string | null;
    cooldown: number | null;
    levels: { level: number; effect: string }[];
  } | null;
};

export type SoulWeapon = Art & {
  id: number;
  name: string;
  soulColor: string | null;
  attack: number | null;
  cost: number | null;
  disassemblyReward: number | null;
  requirement: { item: string | null; grade: string | null };
  stage: { number: number | null; name: string | null };
  engraving: { atk: number | null; hp: number | null };
};

export const SKILLS = skillsData.skills as unknown as Skill[];
export const WEAPONS = weaponsData.weapons as unknown as Gear[];
export const ACCESSORIES = accessoriesData.accessories as unknown as Gear[];
export const RELICS = relicsData.relics as unknown as Relic[];
export const SPIRITS = spiritsData.spirits as unknown as Spirit[];
export const SOUL_WEAPONS = soulWeaponsData.soulWeapons as unknown as SoulWeapon[];
export const GEAR_LEVEL_FACTORS: readonly number[] = gearLevelsData.factors;

export const KNOWN_NAMES: KnownNames = {
  skills: SKILLS.map((skill) => skill.name),
  weapons: WEAPONS.map((gear) => gear.grade),
  accessories: ACCESSORIES.map((gear) => gear.grade),
  relics: RELICS.map((relic) => relic.name),
  spirits: SPIRITS.map((spirit) => spirit.name),
  soulWeapons: SOUL_WEAPONS.map((weapon) => weapon.name),
};

/** Values run into the trillions, so long digit strings get compacted. */
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 });

export function formatValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return Math.abs(value) >= 100_000
    ? compact.format(value)
    : value.toLocaleString("en", { maximumFractionDigits: 2 });
}

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${formatValue(value)}%`;
}
