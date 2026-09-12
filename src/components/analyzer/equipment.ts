import equipmentData from "@/data/equipment.json";

/** Weapons and accessories are graded by rarity rather than named. */
export type Gear = {
  id: number;
  rarity: string;
  tier: string;
  grade: number | null;
  tierRank: number | null;
  dropProbability: number;
  icon: string | null;
};

export type Relic = {
  id: number;
  name: string;
  icon: string | null;
  buff: string | null;
  baseValue: number | null;
  factors: { band: string; value: number | null }[];
};

export type Spirit = {
  id: number;
  name: string;
  element: string | null;
  icon: string | null;
  skill: {
    name: string | null;
    description: string | null;
    type: string | null;
    cooldown: number | null;
    levels: { level: number; effect: string }[];
  };
};

/** Soul weapons run on their own upgrade line, separate from the equip slots. */
export type SoulWeapon = {
  id: number;
  name: string;
  icon: string | null;
  attack: number | null;
  requirements: number | null;
  disassemblyReward: number | null;
  soulColor: string | null;
  chaosSoulGain: number | null;
  stageRequirement: string | null;
};

export const WEAPONS = equipmentData.weapons as unknown as Gear[];
export const ACCESSORIES = equipmentData.accessories as unknown as Gear[];
export const RELICS = equipmentData.relics as unknown as Relic[];
export const SPIRITS = equipmentData.spirits as unknown as Spirit[];
export const SOUL_WEAPONS = equipmentData.soulWeapons as unknown as SoulWeapon[];
export const EQUIPMENT_SOURCE = equipmentData.source;

/** Soul weapon values run into the trillions, so long digit strings get compacted. */
const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 2,
});

export function formatValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return Math.abs(value) >= 100_000 ? compact.format(value) : String(value);
}
