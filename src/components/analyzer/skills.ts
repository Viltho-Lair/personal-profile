import skillsData from "@/data/skills.json";

export type Skill = {
  id: number;
  /** Grid row in the source sheet; four skills per row, lowest grade first. */
  row: number;
  name: string;
  element: string | null;
  /** Icons extracted from the source sheet, served from /public. */
  icon: string | null;
  elementIcon: string | null;
  grade: string;
  maxLevel: number;
  mpCost: number;
  baseValue: number;
  upgradeValue: number;
  cooldown: number;
  range: number;
  duration: number;
  atkDistance: number;
  types: { open: number; skill: number; active: number; passive: number };
  description: { basic: string | null; specific: string | null };
};

export const SKILLS = skillsData.skills as unknown as Skill[];
export const ELEMENTS = skillsData.elements as string[];

export type SkillRow = { row: number; cells: (Skill | null)[] };

/**
 * Rebuilds the sheet's grid: one column per element, in element order.
 * The two Immortal skills carry no element, so they fill the leftmost free
 * cells of their row.
 */
export function buildSkillRows(skills: Skill[] = SKILLS): SkillRow[] {
  const byRow = new Map<number, (Skill | null)[]>();

  const cellsFor = (row: number) => {
    const existing = byRow.get(row);
    if (existing) return existing;
    const created: (Skill | null)[] = Array(ELEMENTS.length).fill(null);
    byRow.set(row, created);
    return created;
  };

  for (const skill of skills) {
    const cells = cellsFor(skill.row);
    const column = skill.element ? ELEMENTS.indexOf(skill.element) : -1;
    if (column >= 0 && cells[column] === null) {
      cells[column] = skill;
      continue;
    }
    const free = cells.indexOf(null);
    if (free >= 0) cells[free] = skill;
  }

  return [...byRow.entries()]
    .sort(([a], [b]) => a - b)
    .map(([row, cells]) => ({ row, cells }));
}

/**
 * Skill power at a level, the way the wiki's own skill card computes it:
 * base + upgrade x (level - 1), capped at the skill's max level.
 *
 * The number the game shows on a skill is higher than this - Ice Stone at
 * level 36 reads 742% in game against 495% here - because the in-game figure
 * also folds in the player's skill proficiency bonus.
 */
export function powerAtLevel(skill: Skill, level: number): number {
  const capped = Math.min(Math.max(level, 1), skill.maxLevel);
  return skill.baseValue + skill.upgradeValue * (capped - 1);
}

export const MAX_SKILL_LEVEL = Math.max(...SKILLS.map((skill) => skill.maxLevel));
