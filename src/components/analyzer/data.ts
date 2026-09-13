import accessoriesData from "@/data/optimizer/accessories.json";
import familiarsData from "@/data/optimizer/familiars.json";
import gearLevelsData from "@/data/optimizer/gear-levels.json";
import relicsData from "@/data/optimizer/relics.json";
import skillMasteryData from "@/data/optimizer/skill-mastery.json";
import skillProficiencyData from "@/data/optimizer/skill-proficiency.json";
import skillsData from "@/data/optimizer/skills.json";
import soulWeaponsData from "@/data/optimizer/soul-weapons.json";
import spiritsData from "@/data/optimizer/spirits.json";
import weaponsData from "@/data/optimizer/weapons.json";
import type { AltarLevel } from "@/lib/game/familiars";
import type { Band } from "@/lib/game/formulas";
import type { FamiliarGroup, KnownNames } from "@/lib/profile/types";

export const GRADE_ORDER = ["Common", "Great", "Rare", "Epic", "Legendary", "Mythic", "Immortal"] as const;
export const ELEMENTS = ["Fire", "Water", "Wind", "Earth"] as const;

type Art = { icon: string | null; iconSize: number | null };

export type SkillCategory = "core" | "seasonal" | "immortal";

export type Skill = Art & {
  id: number;
  name: string;
  element: string | null;
  grade: string;
  category: SkillCategory;
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

export type MasteryNode = {
  id: string;
  /** Top-left cell of the node's 5 x 4 block on the page grid. */
  x: number;
  y: number;
  label: string | null;
  kind: "level" | "check";
  maxLevel: number;
  /** Cost of the next level: base + perLevel * current level. */
  cost: { base: number; perLevel: number } | null;
  bonus: { perLevel: number; percent: boolean } | { text: string | null } | null;
  requires: string | null;
  reward: string | null;
  icon: string | null;
  iconSize: number | null;
  badge: string | null;
  badgeSize: number | null;
};

export type MasteryPage = {
  page: number;
  columns: number;
  rows: number;
  nodes: MasteryNode[];
  /** Grey connector cells ([row, column]) and the nodes they join. */
  links: { cells: [number, number][]; nodes: string[] }[];
};

export type Familiar = {
  id: number;
  name: string;
  group: FamiliarGroup;
  element: string | null;
  stats: { label: string; percent: boolean }[];
  stars: { star: number; rarity: string | null; values: Record<string, number | null> }[];
  special: string | null;
  art: { from: number; to: number; icon: string | null; iconSize: number | null }[];
  symbol: string | null;
  symbolSize: number | null;
};

export const SKILLS = skillsData.skills as unknown as Skill[];
export const WEAPONS = weaponsData.weapons as unknown as Gear[];
export const ACCESSORIES = accessoriesData.accessories as unknown as Gear[];
export const RELICS = relicsData.relics as unknown as Relic[];
export const SPIRITS = spiritsData.spirits as unknown as Spirit[];
export const SOUL_WEAPONS = soulWeaponsData.soulWeapons as unknown as SoulWeapon[];
export const GEAR_LEVEL_FACTORS: readonly number[] = gearLevelsData.factors;

export const SKILL_BY_NAME = new Map(SKILLS.map((skill) => [skill.name, skill]));
export const skillsIn = (category: SkillCategory) =>
  SKILLS.filter((skill) => skill.category === category);

/** All Attribute DMG as a fraction (0.05 = 5%); the index is the proficiency level. */
export const PROFICIENCY_BONUSES: readonly number[] = skillProficiencyData.bonuses;
export const MAX_PROFICIENCY_LEVEL = PROFICIENCY_BONUSES.length - 1;

export const MASTERY_PAGES = skillMasteryData.pages as unknown as MasteryPage[];
export const FAMILIARS = familiarsData.familiars as unknown as Familiar[];
export const MANA_ALTAR: readonly AltarLevel[] = familiarsData.manaAltar;

export const KNOWN_NAMES: KnownNames = {
  skills: SKILLS.map((skill) => skill.name),
  weapons: WEAPONS.map((gear) => gear.grade),
  accessories: ACCESSORIES.map((gear) => gear.grade),
  relics: RELICS.map((relic) => relic.name),
  spirits: SPIRITS.map((spirit) => spirit.name),
  soulWeapons: SOUL_WEAPONS.map((weapon) => weapon.name),
  masteryNodes: MASTERY_PAGES.flatMap((page) => page.nodes.map((node) => node.id)),
  familiars: FAMILIARS.map((familiar) => familiar.name),
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
