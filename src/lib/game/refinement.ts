/**
 * Skill Refinement: attack skills get 3-5 refinement lines. Each line rolls an
 * option and a value; the value's range gives its colour. A skill's owned
 * effect grows with how many lines are the top (Aqua) colour.
 */

import type { Element } from "./stats";

export type RefinementLine = { option: string | null; value: number | null };

export type RefinementData = {
  tiers: string[];
  options: Record<string, number[][]>;
  skills: { name: string; lines: number; owned: { stat: string; values: number[]; percent: boolean } }[];
};

export const COOLDOWN_OPTION = "Cooldown Reduction(%)";
export const STRIKES_OPTION = "Reduction in Required Strikes(%)";
export const ATTRIBUTE_OPTION = "DMG dealt to attribute enemies(%)";

/** The damage cycle: each element deals extra damage to the next (Water > Fire > Earth > Wind > Water). */
export const STRONG_AGAINST: Record<Element, Element> = { Water: "Fire", Fire: "Earth", Earth: "Wind", Wind: "Water" };

/** A skill's six options: cooldown skills roll Cooldown Reduction, hit-triggered ones Reduction in Required Strikes. */
export function refinementOptions(data: RefinementData, trigger: "seconds" | "hits") {
  return Object.keys(data.options).filter((option) => option !== (trigger === "hits" ? COOLDOWN_OPTION : STRIKES_OPTION));
}

export function optionLabel(option: string, element: Element | null) {
  return option === ATTRIBUTE_OPTION && element ? `DMG dealt to ${STRONG_AGAINST[element]} attribute enemies(%)` : option;
}

/** The colour tier (0-5) a value falls in: the highest tier whose range starts at or below it. */
export function tierOf(data: RefinementData, option: string | null, value: number | null): number | null {
  const ranges = option ? data.options[option] : undefined;
  if (!ranges || value === null || value < ranges[0][0]) return null;
  let tier = 0;
  ranges.forEach(([min], index) => {
    if (value >= min) tier = index;
  });
  return tier;
}

/** Owned effect: nothing below 3 top-colour lines, then the 2nd, 3rd and 4th value for 3, 4 and 5. */
export function ownedEffect(data: RefinementData, skill: string, lines: RefinementLine[]) {
  const entry = data.skills.find((s) => s.name === skill);
  if (!entry) return null;
  const top = data.tiers.length - 1;
  const mythic = lines.slice(0, entry.lines).filter((line) => tierOf(data, line.option, line.value) === top).length;
  const step = Math.min(entry.owned.values.length - 1, Math.max(0, mythic - 2));
  return { stat: entry.owned.stat, value: entry.owned.values[step] ?? 0, percent: entry.owned.percent, mythic };
}

/** What a skill's refinement lines do in a fight, as fractions. */
export function refinementEffects(lines: RefinementLine[]) {
  const sum = (option: string) =>
    lines.reduce((total, line) => total + (line.option === option && line.value !== null ? line.value / 100 : 0), 0);
  return {
    damage: sum("DMG Increase(%)"),
    cooldown: sum(COOLDOWN_OPTION),
    strikes: sum(STRIKES_OPTION),
    attribute: sum(ATTRIBUTE_OPTION),
    mana: sum("Mana Consumption Reduction(%)"),
  };
}
