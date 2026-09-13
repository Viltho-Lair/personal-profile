/** Memory Tree rules from the workbook's MEMORY TREE sheet and Tree Data tables. */

export type TreeSubNode = {
  id: number;
  number: number;
  requiresTreeLevel: number;
  /** Node numbers in the same main node that must be maxed first. */
  requires: number[];
  maxLevel: number;
  buff: string | null;
  mode: string | null;
  /** Fraction per level (0.05 = 5%). */
  valuePerLevel: number | null;
  costPerLevel: number;
  reward: { type: string; amount: number } | null;
};

export type TreeMainNode = { id: number; requires: number[]; subNodes: TreeSubNode[] };

export type TreeLevelRow = {
  level: number;
  grade: number;
  needsSubNodeLevels: number;
  /** 1 ATK, 2 HP, 3 VIT (additive); 100 ATK, 101 HP (multipliers from the breakthrough grade). */
  buffs: { type: number; value: number }[];
};

export type MemoryTree = { mainNodes: TreeMainNode[]; levels: TreeLevelRow[] };

export function subNodeLevel(levels: Record<string, number>, node: TreeSubNode): number {
  return Math.min(node.maxLevel, Math.max(0, Math.floor(levels[node.id] ?? 0)));
}

export function totalSubNodeLevels(tree: MemoryTree, levels: Record<string, number>) {
  let spent = 0;
  let max = 0;
  for (const main of tree.mainNodes) {
    for (const node of main.subNodes) {
      spent += subNodeLevel(levels, node);
      max += node.maxLevel;
    }
  }
  return { spent, max };
}

/**
 * The tree level is the row with the largest requirement the spent sub node
 * levels reach; its grade is the breakthrough grade.
 */
export function treeLevel(tree: MemoryTree, spent: number) {
  const reached = tree.levels.filter((row) => row.needsSubNodeLevels <= spent);
  const top = Math.max(0, ...reached.map((row) => row.needsSubNodeLevels));
  const current = reached.find((row) => row.needsSubNodeLevels === top) ?? tree.levels[0];
  const next = tree.levels.find((row) => row.needsSubNodeLevels > spent) ?? null;
  return { level: current?.level ?? 1, grade: current?.grade ?? 0, needs: current?.needsSubNodeLevels ?? 0, next };
}

/** ATK/HP/VIT additive bonuses up to the tree level, multipliers up to the grade; all fractions. */
export function treeBonuses(tree: MemoryTree, level: number, grade: number) {
  const sum = (type: number, include: (row: TreeLevelRow) => boolean) =>
    tree.levels
      .filter(include)
      .reduce((total, row) => total + row.buffs.filter((b) => b.type === type).reduce((t, b) => t + b.value, 0), 0);
  const byLevel = (row: TreeLevelRow) => row.level <= level;
  const byGrade = (row: TreeLevelRow) => row.grade <= grade;
  return {
    atk: sum(1, byLevel),
    hp: sum(2, byLevel),
    vit: sum(3, byLevel),
    atkMultiplier: sum(100, byGrade),
    hpMultiplier: sum(101, byGrade),
  };
}

export function mainNodeComplete(main: TreeMainNode, levels: Record<string, number>): boolean {
  return main.subNodes.every((node) => subNodeLevel(levels, node) >= node.maxLevel);
}

/**
 * A sub node opens at its tree level, once its main node's prerequisite main
 * nodes are complete and the nodes it needs in its own main node are maxed.
 */
export function subNodeOpen(
  tree: MemoryTree,
  main: TreeMainNode,
  node: TreeSubNode,
  levels: Record<string, number>,
  level: number,
): boolean {
  if (level < node.requiresTreeLevel) return false;
  const prerequisitesDone = main.requires.every((id) => {
    const required = tree.mainNodes.find((m) => m.id === id);
    return !required || mainNodeComplete(required, levels);
  });
  if (!prerequisitesDone) return false;
  return node.requires.every((number) => {
    const needed = main.subNodes.find((n) => n.number === number);
    return !needed || subNodeLevel(levels, needed) >= needed.maxLevel;
  });
}

/** Buff totals (CUBE in RIFT, ...) as fractions, and feathers from taken reward nodes. */
export function treeBuffs(tree: MemoryTree, levels: Record<string, number>) {
  const buffs = new Map<string, { buff: string; mode: string; value: number }>();
  const rewards = new Map<string, number>();
  for (const main of tree.mainNodes) {
    for (const node of main.subNodes) {
      const level = subNodeLevel(levels, node);
      if (node.reward) {
        if (level > 0) rewards.set(node.reward.type, (rewards.get(node.reward.type) ?? 0) + node.reward.amount);
      } else if (node.buff && node.mode) {
        const key = `${node.buff} - ${node.mode}`;
        const entry = buffs.get(key) ?? { buff: node.buff, mode: node.mode, value: 0 };
        entry.value += (node.valuePerLevel ?? 0) * level;
        buffs.set(key, entry);
      }
    }
  }
  return {
    buffs: [...buffs.values()].sort((a, b) => a.buff.localeCompare(b.buff) || a.mode.localeCompare(b.mode)),
    rewards: [...rewards.entries()].map(([type, amount]) => ({ type, amount })),
  };
}

/** Memories still needed to max every sub node. */
export function costToMax(tree: MemoryTree, levels: Record<string, number>): number {
  return tree.mainNodes.reduce(
    (total, main) =>
      total + main.subNodes.reduce((t, node) => t + node.costPerLevel * (node.maxLevel - subNodeLevel(levels, node)), 0),
    0,
  );
}

/** Every sub node at its max level. */
export function maxedTree(tree: MemoryTree): Record<string, number> {
  return Object.fromEntries(tree.mainNodes.flatMap((main) => main.subNodes.map((node) => [String(node.id), node.maxLevel])));
}
