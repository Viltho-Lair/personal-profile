/**
 * Upgrade paths. Every piece of content has its own curve, from where it starts to its max (a spirit's levels, an
 * awakening's tiers, a familiar's stars, Breath of Fire's enhance, a skill's levels ...). Over and over, the path moves
 * the curve that lifts the combined damage the most for an equal stretch along it, until the enemy falls: the steepest
 * slope at the current point, not the biggest number at the end. A stretch that costs resources is as big as its
 * price when that's more, and the path spends no more than its budget.
 */

export type PathCandidate = {
  id: string;
  current: number;
  max: number;
  /** How big a step from one level to another is (for the planner, the part of the content's curve it covers). */
  size: (from: number, to: number) => number;
  /** What a step spends of the budget (for the planner, its price as a share of the player's means); nothing when unset. */
  spend?: (from: number, to: number) => number;
};

export type PathStep = { id: string; from: number; to: number; size: number; gain: number };

export type PathResult = {
  steps: PathStep[];
  levels: Record<string, number>;
  own: number;
  total: number;
  won: boolean;
  /** What the whole path spends of the budget. */
  spent: number;
};

/** The fight with some upgrades at other levels: the player's own damage (what upgrades raise) and the fight's total. */
export type PathFight = (levels: Record<string, number>) => { own: number; total: number };

/** A first step covers this much of a curve; later steps grow when a path runs long. */
export const STEP_SIZE = 0.05;
export const MAX_PATH_STEPS = 400;
/** Steps double in size every this many, so a far-off enemy still gets a path of readable length. */
const STEPS_PER_DOUBLING = 25;
/** A path spends no more than this: past it, it's no plan but a wish. */
export const MAX_PATH_SPEND = 3;

/** The next level from `level`: the fewest levels making a step at least `unit` big, or the rest of the way when that's less. */
export function nextStep(candidate: PathCandidate, level: number, unit: number): number {
  if (level >= candidate.max) return level;
  if (candidate.size(level, candidate.max) <= unit) return candidate.max;
  let low = level + 1;
  let high = candidate.max;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (candidate.size(level, mid) >= unit) high = mid;
    else low = mid + 1;
  }
  return low;
}

/** The slope of a step: the log of the damage gain per size; a step of no size that adds anything goes first. */
export const stepScore = (gain: number, size: number) => (size <= 0 ? Infinity : Math.log(gain) / size);

/**
 * Takes steps greedily until the fight's total reaches `hp`, no step adds damage, or the path gets too long. Slopes
 * are refreshed lazily: after a step only the candidate on top is re-measured, since other curves' slopes barely move.
 */
export function buildPath(options: {
  candidates: PathCandidate[];
  fight: PathFight;
  hp: number;
  unit?: number;
  maxSteps?: number;
  maxSpend?: number;
  onFight?: () => void;
}): PathResult {
  const { candidates, fight, hp, onFight } = options;
  const maxSteps = options.maxSteps ?? MAX_PATH_STEPS;
  const maxSpend = options.maxSpend ?? MAX_PATH_SPEND;
  let spent = 0;
  let unit = options.unit ?? STEP_SIZE;
  const levels: Record<string, number> = Object.fromEntries(candidates.map((c) => [c.id, c.current]));
  let now = fight(levels);
  onFight?.();
  let version = 0;
  type Entry = { candidate: PathCandidate; to: number; size: number; spend: number; gain: number; score: number; result: { own: number; total: number }; version: number };
  const spendOf = (candidate: PathCandidate, from: number, to: number) => candidate.spend?.(from, to) ?? 0;

  const measure = (candidate: PathCandidate): Entry | null => {
    const from = levels[candidate.id]!;
    let to = nextStep(candidate, from, unit);
    // A step shrinks to what's left of the budget; one level that costs more than that is out of reach.
    while (to > from && spendOf(candidate, from, to) > maxSpend - spent) to = to - Math.max(1, Math.floor((to - from) / 2));
    if (to <= from) return null;
    const size = candidate.size(from, to);
    const spend = spendOf(candidate, from, to);
    if (!Number.isFinite(spend)) return null;
    const result = fight({ ...levels, [candidate.id]: to });
    onFight?.();
    const gain = result.own / Math.max(now.own, 1e-300);
    if (!(gain > 1 + 1e-9)) return null;
    return { candidate, to, size, spend, gain, score: stepScore(gain, size), result, version };
  };

  const steps: PathStep[] = [];
  const queue = candidates.map(measure).filter((e): e is Entry => e !== null);
  while (steps.length < maxSteps && now.total < hp && queue.length) {
    queue.sort((a, b) => b.score - a.score);
    const top = queue.shift()!;
    if (top.version !== version) {
      const fresh = measure(top.candidate);
      if (fresh) queue.push(fresh);
      continue;
    }
    const from = levels[top.candidate.id]!;
    levels[top.candidate.id] = top.to;
    now = top.result;
    spent += top.spend;
    version += 1;
    steps.push({ id: top.candidate.id, from, to: top.to, size: top.size, gain: top.gain });
    if (steps.length % STEPS_PER_DOUBLING === 0) unit *= 2;
    const next = measure(top.candidate);
    if (next) queue.push(next);
  }
  return { steps, levels, own: now.own, total: now.total, won: now.total >= hp, spent };
}

/** Steps merged per upgrade, in the order each was first taken: from its first level to its last. */
export function mergeSteps(steps: readonly PathStep[]): { id: string; from: number; to: number }[] {
  const merged = new Map<string, { id: string; from: number; to: number }>();
  for (const step of steps) {
    const seen = merged.get(step.id);
    if (seen) seen.to = step.to;
    else merged.set(step.id, { id: step.id, from: step.from, to: step.to });
  }
  return [...merged.values()];
}
