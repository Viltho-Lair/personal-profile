import type { Element } from "./stats";

/** Each element beats one other: Fire beats Earth, Earth beats Wind, Wind beats Water, Water beats Fire. */
export const BEATS: Record<Element, Element> = { Fire: "Earth", Earth: "Wind", Wind: "Water", Water: "Fire" };

export const STRONG_HIT = 2;
export const WEAK_HIT = 0.7;

/** Damage multiplier of an elemental hit on an enemy: x2 on the element it beats, x0.7 on the one that beats it, x1 otherwise. */
export function elementMatchup(attacker: Element | null, defender: Element | null): number {
  if (!attacker || !defender) return 1;
  if (BEATS[attacker] === defender) return STRONG_HIT;
  if (BEATS[defender] === attacker) return WEAK_HIT;
  return 1;
}
