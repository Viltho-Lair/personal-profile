/** Constellation of Light rules from the workbook's CONSTELLATION sheet and Constellation Data tables. */

export type ConstellationNode = {
  id: number;
  number: number;
  size: string;
  energy: number;
  buff: string;
  appliesTo: string;
  /** Whole percent (5 = 5%). */
  value: number;
  element: string;
  unlockLevel: number;
};

export type ConstellationSign = {
  name: string;
  element: string;
  unlockLevel: number;
  icon: string | null;
  nodes: ConstellationNode[];
};

export type ConstellationLevel = {
  level: number;
  starsNeeded: number;
  /** Whole percents. */
  extraAtk: number;
  extraHp: number;
  extraHpRecovery: number;
  craftingTimeReduced: number;
  classLevelCap: number;
};

export type Constellation = { signs: ConstellationSign[]; levels: ConstellationLevel[] };

export const NO_STAR = 0;
export const OTHER_STAR = 1;
export const MATCHING_STAR = 2;

export const matchingStarName = (node: ConstellationNode) => `Star of ${node.element} (${node.size})`;

export function nodeStar(stars: Record<string, number>, node: ConstellationNode): number {
  const star = stars[node.id];
  return star === OTHER_STAR || star === MATCHING_STAR ? star : NO_STAR;
}

/** A placed star gives its energy, five times over when it matches the node's element and size. */
export function starEnergy(node: ConstellationNode, star: number): number {
  return star === NO_STAR ? 0 : node.energy * (star === MATCHING_STAR ? 5 : 1);
}

/**
 * A sign's star energy and, once every node has a star, its completion
 * effects: Amplify <element> DMG floor(energy / 100)% and Extra Promotion
 * ATK/HP floor(energy / 10)%, which also engraves the sign's node buffs.
 */
export function signSummary(sign: ConstellationSign, stars: Record<string, number>) {
  const energy = sign.nodes.reduce((total, node) => total + starEnergy(node, nodeStar(stars, node)), 0);
  const placed = sign.nodes.filter((node) => nodeStar(stars, node) !== NO_STAR).length;
  const complete = placed === sign.nodes.length;
  const promotion = complete ? Math.floor(energy / 10) : 0;
  return { energy, placed, complete, amplify: complete ? Math.floor(energy / 100) : 0, promotion, engraved: promotion };
}

/** A node's buff in whole percent, raised by its sign's engraved effect. */
export function nodeBuff(node: ConstellationNode, star: number, engraved: number): number {
  return star === NO_STAR ? 0 : Math.floor(node.value * (1 + engraved / 100));
}

export function constellationLevel(data: Constellation, starsPlaced: number) {
  const reached = data.levels.filter((row) => row.starsNeeded <= starsPlaced);
  const current = reached[reached.length - 1] ?? data.levels[0];
  const next = data.levels.find((row) => row.starsNeeded > starsPlaced) ?? null;
  return { current, next };
}

/** A sign's nodes open once the constellation reaches the sign's unlock level. */
export const signOpen = (sign: ConstellationSign, level: number) => level >= sign.unlockLevel;

export function constellationTotals(data: Constellation, stars: Record<string, number>) {
  const signs = data.signs.map((sign) => ({ sign, ...signSummary(sign, stars) }));
  const placed = signs.reduce((total, s) => total + s.placed, 0);
  const amplify: Record<string, number> = {};
  const buffs = new Map<string, { buff: string; appliesTo: string; value: number }>();
  let promotion = 0;
  for (const summary of signs) {
    amplify[summary.sign.element] = (amplify[summary.sign.element] ?? 0) + summary.amplify;
    promotion += summary.promotion;
    for (const node of summary.sign.nodes) {
      const key = `${node.buff} - ${node.appliesTo}`;
      const entry = buffs.get(key) ?? { buff: node.buff, appliesTo: node.appliesTo, value: 0 };
      entry.value += nodeBuff(node, nodeStar(stars, node), summary.engraved);
      buffs.set(key, entry);
    }
  }
  return {
    signs,
    placed,
    amplify,
    promotion,
    buffs: [...buffs.values()].sort((a, b) => a.buff.localeCompare(b.buff) || a.appliesTo.localeCompare(b.appliesTo)),
    ...constellationLevel(data, placed),
  };
}
