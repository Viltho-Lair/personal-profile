/**
 * Class summoning, and the diamonds it takes to own a class.
 *
 * A summon draws a grade by the game's Class Summon Probability screen, and each grade is one class: grade 1 is
 * Trainee, grade 19 Dark Rain. Grade 20 (Blast) shows 0%, so it can't be summoned.
 *
 * The class summon reward bar levels up the summon level, and each level up gives a class, whatever the summons
 * drew in between: level 0 to 1 takes 100 summons and gives a grade 10, up to level 8 to 9 at 2,000 summons for a
 * grade 18. From level 9 on, every 3,000 summons gives a grade 19.
 *
 * Five classes of a grade merge into one of the next grade, up to grade 19 (Dark Rain).
 *
 * Nova, the last class, is Blast awakened: Seed at 5 stars (awakening 17) takes 10,000 shards to reach Nova.
 * The steps from Dark Rain to Seed 5 stars aren't priced yet.
 */

/** Chance of each grade per summon, in percent, grade 1 first, as the game lists them. */
export const CLASS_SUMMON_CHANCES: readonly number[] = [
  8.76, 12.3, 13.5, 12.4, 11.3, 10.2, 9.1, 7.5, 5.4, 3.4, 2.8, 1.9, 0.8, 0.3, 0.15, 0.12, 0.04, 0.02, 0.01, 0,
];
/** Grades a summon can give: 1 to 19. */
export const CLASS_SUMMON_GRADES = 19;
export const DARK_RAIN = 19;
/** Seed 5 stars to Nova. */
export const NOVA_SHARDS = 10_000;

/** Summon levels 0 to 8: the summons to the next level and the grade of class that level up gives. */
export const CLASS_LEVELS: readonly { summons: number; reward: number }[] = [
  { summons: 100, reward: 10 },
  { summons: 200, reward: 11 },
  { summons: 300, reward: 12 },
  { summons: 400, reward: 13 },
  { summons: 500, reward: 14 },
  { summons: 700, reward: 15 },
  { summons: 1000, reward: 16 },
  { summons: 1500, reward: 17 },
  { summons: 2000, reward: 18 },
];
/** Level 9 and on: a grade 19 every 3,000 summons. */
export const CLASS_TOP_LEVEL = CLASS_LEVELS.length;
export const CLASS_TOP_STEP = { summons: 3000, reward: DARK_RAIN };

/** The summons a summon level takes to level up, and the class it gives. */
export const levelStep = (level: number) => CLASS_LEVELS[Math.max(0, Math.floor(level))] ?? CLASS_TOP_STEP;

export const CLASS_SINGLE = { summons: 1, diamonds: 300 };
/**
 * The bundle: 10 summons and the bonus for 3,000 diamonds. The bonus is one summon a summon level, +1 at level 0 up
 * to +10 at level 9 and on: 11 summons a bundle at level 0, 19 at level 8, 20 from level 9.
 */
export const CLASS_BUNDLE_DIAMONDS = 3000;
export const CLASS_BUNDLE_BASE = 10;
export const MAX_CLASS_BONUS = CLASS_TOP_LEVEL + 1;
export const bonusAt = (level: number) => Math.min(MAX_CLASS_BONUS, Math.max(0, Math.floor(level || 0)) + 1);
export const bundleOf = (level: number) => ({
  summons: CLASS_BUNDLE_BASE + bonusAt(level),
  diamonds: CLASS_BUNDLE_DIAMONDS,
});

const chance = (grade: number) => (CLASS_SUMMON_CHANCES[grade - 1] ?? 0) / 100;

/** One summon's grade (1-19) from a roll in [0, 1). */
export function rollGrade(roll: number): number {
  let at = roll * 100;
  for (let grade = 1; grade <= CLASS_SUMMON_GRADES; grade++) {
    at -= CLASS_SUMMON_CHANCES[grade - 1]!;
    if (at < 0) return grade;
  }
  // The listed chances add to 100% only after rounding; the last few hundredths go to grade 1.
  return 1;
}

/** Where the reward bar is: the summon level and the summons on the bar at that level. */
export type ClassBar = { level: number; progress: number };

/** A summon level of 0 or more (9 and above all work alike), with the bar short of its next level up. */
export function clampBar(bar: ClassBar): ClassBar {
  const level = Math.max(0, Math.floor(bar.level || 0));
  const progress = Math.min(levelStep(level).summons - 1, Math.max(0, Math.floor(bar.progress || 0)));
  return { level, progress };
}

export type ClassSim = {
  /** Copies summoned of each grade, grade 1 at index 0. */
  owned: number[];
  summons: number;
  diamonds: number;
  bar: ClassBar;
};

export const emptyClassSim = (bar: ClassBar = { level: 0, progress: 0 }): ClassSim => ({
  owned: Array(CLASS_SUMMON_GRADES).fill(0),
  summons: 0,
  diamonds: 0,
  bar: clampBar(bar),
});

/** Summons `count` classes for `diamonds`; each level up of the reward bar gives its class. */
export function summonClasses(sim: ClassSim, count: number, diamonds: number, random: () => number = Math.random) {
  const owned = [...sim.owned];
  const drawn: number[] = Array(CLASS_SUMMON_GRADES).fill(0);
  let { level, progress } = sim.bar;
  const rewards: number[] = [];
  for (let i = 0; i < count; i++) {
    const grade = rollGrade(random());
    owned[grade - 1]!++;
    drawn[grade - 1]!++;
    const step = levelStep(level);
    if (++progress >= step.summons) {
      progress = 0;
      level++;
      rewards.push(step.reward);
      owned[step.reward - 1]!++;
      drawn[step.reward - 1]!++;
    }
  }
  return {
    sim: { owned, summons: sim.summons + count, diamonds: sim.diamonds + diamonds, bar: { level, progress } },
    drawn,
    rewards,
  };
}

/** Five classes of a grade merge into one of the next grade, up to grade 19 (Dark Rain). */
export const CLASS_MERGE = 5;

/** The classes owned, merged five to one as far as they go: nothing merges past Dark Rain. */
export function mergeClasses(owned: readonly number[]): number[] {
  const merged = [...owned];
  for (let grade = 1; grade < DARK_RAIN; grade++) {
    const up = Math.floor((merged[grade - 1] ?? 0) / CLASS_MERGE);
    merged[grade - 1]! -= up * CLASS_MERGE;
    merged[grade] = (merged[grade] ?? 0) + up;
  }
  return merged;
}

/** Whether the classes owned hold one of `grade`, merging included. */
export const ownsClass = (owned: readonly number[], grade: number) => (mergeClasses(owned)[grade - 1] ?? 0) > 0;

/** Summons until the reward bar gives a class of `grade`, or Infinity when it won't. */
export function rewardIn(grade: number, bar: ClassBar): number {
  let { level, progress } = clampBar(bar);
  let summons = 0;
  // Past level 9 the bar only gives grade 19s, so one pass over the levels is enough.
  for (;;) {
    const step = levelStep(level);
    summons += step.summons - progress;
    if (step.reward === grade) return summons;
    if (level >= CLASS_TOP_LEVEL) return Infinity;
    level++;
    progress = 0;
  }
}

/** Average summons to own a class of `grade` without merging, from the reward bar at `bar`. */
export function expectedSummons(grade: number, bar: ClassBar = { level: 0, progress: 0 }): number {
  const p = chance(grade);
  const cap = rewardIn(grade, bar);
  if (p <= 0) return cap;
  // Sum over k < cap of P(no copy in the first k summons).
  return Number.isFinite(cap) ? (1 - (1 - p) ** cap) / p : 1 / p;
}

/** A small seeded random number generator, so the estimate comes out the same every time. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Runs the estimate averages over, and the most summons one run may take before it's given up on. */
export const ESTIMATE_RUNS = 1000;
const RUN_LIMIT = 2_000_000;

/**
 * One run to the first class of `grade`: a summon of it, the reward bar giving it, or enough lower classes to merge
 * into it (five of a grade make one of the next). Counts lower classes in grade 1 units, 5^(grade - 1) each, so the
 * merge is exact: merged up, they give one of `grade` once they add up to 5^(grade - 1).
 */
export function summonsToOwn(grade: number, bar: ClassBar, random: () => number): number {
  let { level, progress } = clampBar(bar);
  const target = CLASS_MERGE ** (grade - 1);
  let value = 0;
  const add = (got: number) => {
    if (got === grade) return true;
    if (got < grade) value += CLASS_MERGE ** (got - 1);
    return value >= target;
  };
  for (let summons = 1; summons <= RUN_LIMIT; summons++) {
    if (add(rollGrade(random()))) return summons;
    const step = levelStep(level);
    if (++progress >= step.summons) {
      progress = 0;
      level++;
      if (add(step.reward)) return summons;
    }
  }
  return RUN_LIMIT;
}

/**
 * Diamonds for that many summons bought in bundles from the reward bar at `bar`: each level's summons come in that
 * level's bundle, which grows as the bar levels up (an average, so part bundles count pro rata).
 */
export function diamondsFor(summons: number, bar: ClassBar = { level: 0, progress: 0 }): number {
  if (!Number.isFinite(summons)) return Infinity;
  let { level, progress } = clampBar(bar);
  let left = Math.max(0, summons);
  let diamonds = 0;
  while (left > 0) {
    // From level 9 on the bundle stays the same, so the rest go at once.
    const here = level >= CLASS_TOP_LEVEL ? left : Math.min(left, levelStep(level).summons - progress);
    diamonds += (here / bundleOf(level).summons) * CLASS_BUNDLE_DIAMONDS;
    left -= here;
    progress = 0;
    level++;
  }
  return diamonds;
}

/** "Nova" or a grade 1-19. Nova rests on Dark Rain; the steps after it aren't priced yet. */
export type ClassGoal = number | "nova";
export const goalGrade = (goal: ClassGoal) => (goal === "nova" ? DARK_RAIN : goal);

/**
 * What owning a class takes from the reward bar at `bar`, over {@link ESTIMATE_RUNS} runs: summoning it, the bar
 * giving it, or merging lower classes up to it, whichever comes first. The average, and the summons half and nine in
 * ten runs are done by.
 */
export function estimateClass(goal: ClassGoal, bar: ClassBar = { level: 0, progress: 0 }, runs = ESTIMATE_RUNS) {
  const grade = goalGrade(goal);
  const random = seeded(grade * 1_000_003 + bar.level * 10_007 + bar.progress);
  const results = Array.from({ length: runs }, () => summonsToOwn(grade, bar, random)).sort((a, b) => a - b);
  const summons = results.reduce((sum, n) => sum + n, 0) / runs;
  const diamonds = results.reduce((sum, n) => sum + diamondsFor(n, bar), 0) / runs;
  const cap = rewardIn(grade, bar);
  const at = (odds: number) => {
    const n = results[Math.min(runs - 1, Math.ceil(odds * runs) - 1)]!;
    return { summons: n, diamonds: diamondsFor(n, bar) };
  };
  return {
    grade,
    summons,
    diamonds,
    median: at(0.5),
    likely: at(0.9),
    /** The most it can take, when the reward bar will give the class. */
    cap: Number.isFinite(cap) ? { summons: cap, diamonds: diamondsFor(cap, bar) } : null,
    shards: goal === "nova" ? NOVA_SHARDS : 0,
  };
}
