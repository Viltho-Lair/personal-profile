/**
 * Soul weapon engraving: tetromino soul gems placed on a weapon's plate.
 * A gem's stat follows its shape; its value is what the game shows for it
 * (the gem stat tables aren't public), so the player enters it.
 */

export type Cell = readonly [row: number, col: number];

export type EngravingStat = "atk" | "hp" | "hpRecovery" | "critDamage" | "gold" | "accuracy" | "dodge";

/** The game's seven soul gem shapes (SoulGem_*_1 ... _7), as drawn upright. */
export const GEM_SHAPES: readonly { id: number; name: string; stat: EngravingStat; label: string; percent: boolean; cells: readonly Cell[] }[] = [
  { id: 1, name: "L", stat: "atk", label: "ATK", percent: true, cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { id: 2, name: "J", stat: "hp", label: "HP", percent: true, cells: [[0, 1], [1, 1], [2, 1], [2, 0]] },
  { id: 3, name: "T", stat: "hpRecovery", label: "HP Recovery", percent: true, cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },
  { id: 4, name: "O", stat: "critDamage", label: "CRIT Dmg", percent: true, cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { id: 5, name: "I", stat: "gold", label: "Extra Gold", percent: true, cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { id: 6, name: "S", stat: "accuracy", label: "Accuracy", percent: false, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { id: 7, name: "Z", stat: "dodge", label: "Dodge", percent: false, cells: [[0, 1], [1, 1], [1, 0], [2, 0]] },
];

/** Soul gem grades by colour, as the game art tints them (SoulGem_0 ... SoulGem_5). */
export const GEM_RARITIES = ["White", "Green", "Orange", "Purple", "Red", "Aqua"] as const;
export const GEM_SLOTS = 8;

/** One of the eight soul gems; `value` is the stat as the game shows it (5 = +5%, or +5 for Accuracy/Dodge). */
export type SoulGem = { shape: number; rarity: number; level: number; value: number };

/** A gem on a plate: which of the eight gems, its top-left anchor and quarter turns clockwise. */
export type GemPlacement = { gem: number; row: number; col: number; rotation: number };

export const shapeOf = (id: number) => GEM_SHAPES.find((shape) => shape.id === id);

/** The shape's cells after `rotation` quarter turns clockwise, moved back to start at 0,0. */
export function rotatedCells(shapeId: number, rotation: number): Cell[] {
  let cells: Cell[] = [...(shapeOf(shapeId)?.cells ?? [])];
  const turns = ((Math.floor(rotation) % 4) + 4) % 4;
  for (let i = 0; i < turns; i += 1) cells = cells.map(([r, c]) => [c, -r] as const);
  const minRow = Math.min(...cells.map(([r]) => r));
  const minCol = Math.min(...cells.map(([, c]) => c));
  return cells.map(([r, c]) => [r - minRow, c - minCol] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

export function placedCells(placement: GemPlacement, shapeId: number): Cell[] {
  return rotatedCells(shapeId, placement.rotation).map(([r, c]) => [r + placement.row, c + placement.col] as const);
}

const key = ([r, c]: Cell) => `${r},${c}`;

export const isActive = (rows: readonly string[], [r, c]: Cell) => rows[r]?.[c] === "#";

/** Which gem covers each cell of the plate. */
export function occupancy(placements: readonly GemPlacement[], gems: readonly (SoulGem | null)[]) {
  const cells = new Map<string, number>();
  for (const placement of placements) {
    const gem = gems[placement.gem];
    if (!gem) continue;
    for (const cell of placedCells(placement, gem.shape)) cells.set(key(cell), placement.gem);
  }
  return cells;
}

/** A gem fits when every cell lands on an open plate cell no other gem covers. */
export function canPlace(
  rows: readonly string[],
  placements: readonly GemPlacement[],
  gems: readonly (SoulGem | null)[],
  placement: GemPlacement,
): boolean {
  const gem = gems[placement.gem];
  if (!gem) return false;
  const taken = occupancy(placements.filter((p) => p.gem !== placement.gem), gems);
  return placedCells(placement, gem.shape).every((cell) => isActive(rows, cell) && !taken.has(key(cell)));
}

export const activeCellCount = (rows: readonly string[]) => rows.join("").split("").filter((ch) => ch === "#").length;

/** The plate is complete when every open cell is covered. */
export function plateComplete(rows: readonly string[], placements: readonly GemPlacement[], gems: readonly (SoulGem | null)[]) {
  const covered = occupancy(placements, gems);
  const total = activeCellCount(rows);
  let filled = 0;
  rows.forEach((line, r) => {
    for (let c = 0; c < line.length; c += 1) if (line[c] === "#" && covered.has(key([r, c]))) filled += 1;
  });
  return total > 0 && filled === total;
}

/** Stat totals from the gems placed on a plate; percents as fractions, Accuracy/Dodge flat. */
export function gemTotals(placements: readonly GemPlacement[], gems: readonly (SoulGem | null)[]): Record<EngravingStat, number> {
  const totals: Record<EngravingStat, number> = { atk: 0, hp: 0, hpRecovery: 0, critDamage: 0, gold: 0, accuracy: 0, dodge: 0 };
  for (const placement of placements) {
    const gem = gems[placement.gem];
    const shape = gem ? shapeOf(gem.shape) : undefined;
    if (!gem || !shape) continue;
    totals[shape.stat] += shape.percent ? gem.value / 100 : gem.value;
  }
  return totals;
}
