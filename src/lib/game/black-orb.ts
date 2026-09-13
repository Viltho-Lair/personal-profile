import { ELEMENTS, noElements, type ByElement, type Element } from "./stats";

/** Black Orb Data: orb level buffs, resonance by total accessory level and awakening shares, all in percent. */
export type BlackOrbData = {
  buffs: { level: number; type: "boss" | "monster"; value: number }[];
  resonance: { levels: number; hp: number; atk: number; all: number }[];
  awakening: [number, number][];
};

/** One option line: its element ("All" for every attribute), percent and awakened "+" level. */
export type OrbLine = { element: Element | "All" | null; value: number; bonus: number };
/** A Black Orb accessory: level (0: not owned), top stat in percent as shown in game, and 4 lines. */
export type OrbAccessory = { level: number; top: number; lines: OrbLine[] };
export type BlackOrbState = { level: number; accessories: Record<Element, OrbAccessory> };

export const ORB_LINES = 4;
/** Orb levels that open resonance, awakening and bonus effects. */
export const RESONANCE_LEVEL = 16;
export const AWAKENING_LEVEL = 20;
export const BONUS_EFFECT_LEVEL = 24;
const RESONANCE_MIN_LEVELS = 50;

export const emptyOrbAccessory = (): OrbAccessory => ({
  level: 0,
  top: 0,
  lines: Array.from({ length: ORB_LINES }, () => ({ element: null, value: 0, bonus: 0 })),
});

export const emptyBlackOrb = (): BlackOrbState => ({
  level: 0,
  accessories: { Fire: emptyOrbAccessory(), Water: emptyOrbAccessory(), Wind: emptyOrbAccessory(), Earth: emptyOrbAccessory() },
});

const lookup = <T,>(rows: T[], key: (row: T) => number, value: number): T | undefined => {
  let found: T | undefined;
  for (const row of rows) if (key(row) <= value) found = row;
  return found;
};

/** Lines matching the accessory's own element with a value (the Bonus Effect count). */
export const matchingLines = (element: Element, accessory: OrbAccessory) =>
  accessory.lines.filter((line) => line.element === element && line.value !== 0).length;

/** An accessory's Bonus Effect: 5% at 2 matching lines, 10% at 3 (its element) or 4 (every attribute). */
export const bonusEffect = (matching: number) => (matching >= 3 ? 0.1 : matching === 2 ? 0.05 : 0);

export type BlackOrbEffects = {
  /** Amps by element (Black Orb Data H290 without the statue and constellation): lines, awakened lines, bonus effects, resonance. */
  amp: ByElement;
  /** Element damage added by the orb (H291): each accessory's top stat plus its awakening effect. */
  element: ByElement;
  /** Resonance ATK and HP, and orb level boss / monster damage, as fractions. */
  atk: number;
  hp: number;
  boss: number;
  monster: number;
  resonanceAll: number;
  totalLevels: number;
};

export function blackOrbEffects(data: BlackOrbData, orb: BlackOrbState): BlackOrbEffects {
  // An accessory counts once anything about it is filled in, even with its level left at 0.
  const owned = ELEMENTS.filter((e) => {
    const a = orb.accessories[e];
    return a.level > 0 || a.top > 0 || a.lines.some((line) => line.element !== null && line.value > 0);
  });
  const totalLevels = owned.reduce((sum, e) => sum + orb.accessories[e].level, 0);
  const reso = orb.level >= RESONANCE_LEVEL && totalLevels >= RESONANCE_MIN_LEVELS ? lookup(data.resonance, (r) => r.levels, totalLevels) : undefined;
  const resonanceAll = (reso?.all ?? 0) / 100;
  const awakened = orb.level >= AWAKENING_LEVEL;
  const bonusOpen = orb.level >= BONUS_EFFECT_LEVEL;

  const amp = noElements();
  const element = noElements();
  const fourLine = owned.filter((e) => matchingLines(e, orb.accessories[e]) === 4);

  for (const target of ELEMENTS) {
    amp[target] += resonanceAll;
    for (const source of owned) {
      // A line amplifies its element, doubled on the accessory of that element, or every attribute.
      for (const line of orb.accessories[source].lines) {
        const share = line.element === "All" ? 1 : line.element === target ? (target === source ? 2 : 1) : 0;
        amp[target] += share * (line.value + (awakened ? line.bonus : 0)) / 100;
      }
    }
    if (bonusOpen) {
      if (owned.includes(target)) amp[target] += bonusEffect(matchingLines(target, orb.accessories[target]));
      amp[target] += 0.1 * fourLine.filter((e) => e !== target).length;
    }
  }

  for (const e of owned) {
    const accessory = orb.accessories[e];
    const top = accessory.top / 100;
    const plus = accessory.lines.reduce((sum, line) => sum + line.bonus, 0);
    const share = awakened ? (lookup(data.awakening, (row) => row[0], plus)?.[1] ?? 0) / 100 : 0;
    element[e] = top + Math.floor(share * top * 100) / 100;
  }

  const buff = (type: "boss" | "monster") =>
    data.buffs.filter((b) => b.type === type && b.level <= orb.level).reduce((sum, b) => sum + b.value, 0) / 100;

  return {
    amp,
    element,
    atk: (reso?.atk ?? 0) / 100,
    hp: (reso?.hp ?? 0) / 100,
    boss: buff("boss"),
    monster: buff("monster"),
    resonanceAll,
    totalLevels,
  };
}
