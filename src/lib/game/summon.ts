/**
 * Weapon and accessory summoning.
 *
 * A summon draws a rarity by the summon level's chances (the game's
 * Probabilities screen), then a grade within it: Grade 4 40%, 3 30%, 2 20%,
 * 1 10%. Every summon counts toward the summon level, which needs a set number
 * of summons before the next one; passing a milestone hands over Ellie's Summon
 * Gift Box.
 */

export const SUMMON_RARITIES = ["Common", "Great", "Rare", "Epic", "Legendary", "Mythic"] as const;
export type SummonRarity = (typeof SUMMON_RARITIES)[number];

/** Chance of each rarity per summon level, in percent, as the game lists them. Each level adds up to 100. */
export const SUMMON_CHANCES: Record<number, Record<SummonRarity, number>> = {
  1: { Common: 68.58, Great: 25.5, Rare: 5.4, Epic: 0.5149, Legendary: 0.005, Mythic: 0.0001 },
  2: { Common: 54.2, Great: 32.8, Rare: 11.2, Epic: 1.7197, Legendary: 0.08, Mythic: 0.0003 },
  3: { Common: 33.1, Great: 43.5, Rare: 18.4, Epic: 4.7982, Legendary: 0.2, Mythic: 0.0018 },
  4: { Common: 10.56, Great: 55.84, Rare: 23.5, Epic: 9.59, Legendary: 0.5, Mythic: 0.01 },
  5: { Common: 7.2, Great: 45, Rare: 28.5, Epic: 18.575, Legendary: 0.7, Mythic: 0.025 },
  6: { Common: 5.08, Great: 31.2, Rare: 40.05, Epic: 22.618, Legendary: 1.02, Mythic: 0.032 },
  7: { Common: 4.41, Great: 21, Rare: 36.5, Epic: 36.5, Legendary: 1.54, Mythic: 0.05 },
  8: { Common: 2.68, Great: 18, Rare: 29, Epic: 48.2, Legendary: 2.05, Mythic: 0.07 },
  9: { Common: 0.11, Great: 4.2, Rare: 18, Epic: 73.57, Legendary: 4.02, Mythic: 0.1 },
  10: { Common: 0.01, Great: 0.5, Rare: 9.49, Epic: 82.85, Legendary: 7, Mythic: 0.15 },
};

/** The grade inside the rarity, weakest first: "Common 4" down to "Common 1". */
export const GRADE_CHANCES: readonly { grade: number; chance: number }[] = [
  { grade: 4, chance: 40 },
  { grade: 3, chance: 30 },
  { grade: 2, chance: 20 },
  { grade: 1, chance: 10 },
];

export const MIN_SUMMON_LEVEL = 1;
export const MAX_SUMMON_LEVEL = 10;
/** The game summons this many at a time. */
export const SUMMON_BATCH = 33;

/** Summons a level takes before the next one; the last level doesn't go anywhere. */
export const SUMMONS_TO_NEXT: Record<number, number | null> = {
  1: 100,
  2: 500,
  3: 1000,
  4: 4800,
  5: 4800,
  6: 25000,
  7: 55000,
  8: 88000,
  9: 100000,
  10: null,
};

/**
 * Ellie's Summon Gift Box: Mythic Grade 1 weapons or accessories handed over at a milestone. `at` is the level
 * reached, and 7.5 is half of level 7's summons.
 */
export const SUMMON_REWARDS: readonly { at: number; mythicG1: number }[] = [
  { at: 5, mythicG1: 1 },
  { at: 6, mythicG1: 1 },
  { at: 7, mythicG1: 2 },
  { at: 7.5, mythicG1: 3 },
  { at: 8, mythicG1: 4 },
];

export const MYTHIC_G1 = "Mythic 1";

export type SummonState = {
  /** Summon level, 1-10. */
  level: number;
  /** Summons made at this level, toward the next one. */
  progress: number;
};

/** What a summon produced: its rarity, grade and the gear grade's name ("Epic 3"). */
export type SummonDraw = { rarity: SummonRarity; grade: number; name: string };

export type SummonRun = {
  state: SummonState;
  /** How many of each grade name came out, rewards included. */
  drawn: Record<string, number>;
  /** Summons made. */
  summons: number;
  /** Milestones passed, and the Mythic Grade 1 items they gave. */
  rewards: { at: number; mythicG1: number }[];
};

export const summonsToNext = (level: number): number | null => SUMMONS_TO_NEXT[clampSummonLevel(level)] ?? null;

export const clampSummonLevel = (level: number) =>
  Math.min(MAX_SUMMON_LEVEL, Math.max(MIN_SUMMON_LEVEL, Math.floor(level) || MIN_SUMMON_LEVEL));

/**
 * Where a level and its progress sit as one number, so milestones read the way the game writes them: level 7 half
 * way through is 7.5. The last level has nowhere to go, so it stays at its own number.
 */
export function summonPosition(level: number, progress: number): number {
  const clamped = clampSummonLevel(level);
  const toNext = summonsToNext(clamped);
  if (!toNext) return clamped;
  return clamped + Math.min(1, Math.max(0, progress) / toNext);
}

/** The gift boxes between two positions: passing 7.5 counts, and a level you start at is already collected. */
export const rewardsBetween = (from: number, to: number) => SUMMON_REWARDS.filter((r) => r.at > from && r.at <= to);

/** Picks by weight from chances in percent; `roll` is 0-1. */
function pickBy<T>(entries: readonly { value: T; chance: number }[], roll: number): T {
  const total = entries.reduce((sum, entry) => sum + entry.chance, 0);
  let left = roll * total;
  for (const entry of entries) {
    left -= entry.chance;
    if (left < 0) return entry.value;
  }
  return entries[entries.length - 1]!.value;
}

/** One summon at this level. */
export function drawSummon(level: number, random: () => number): SummonDraw {
  const chances = SUMMON_CHANCES[clampSummonLevel(level)]!;
  const rarity = pickBy(
    SUMMON_RARITIES.map((value) => ({ value, chance: chances[value] })),
    random(),
  );
  const grade = pickBy(
    GRADE_CHANCES.map((entry) => ({ value: entry.grade, chance: entry.chance })),
    random(),
  );
  return { rarity, grade, name: `${rarity} ${grade}` };
}

/**
 * Summons `count` times from this state. Every summon raises the level's progress, and each milestone passed adds
 * its Mythic Grade 1 items to what came out.
 */
export function summon(state: SummonState, count: number, random: () => number = Math.random): SummonRun {
  let level = clampSummonLevel(state.level);
  let progress = Math.max(0, Math.floor(state.progress));
  const from = summonPosition(level, progress);
  const drawn: Record<string, number> = {};
  let summons = 0;

  for (let i = 0; i < count; i += 1) {
    summons += 1;
    const draw = drawSummon(level, random);
    drawn[draw.name] = (drawn[draw.name] ?? 0) + 1;
    progress += 1;
    // A level over its count carries the rest into the next one; the last level just keeps counting.
    for (let toNext = summonsToNext(level); toNext !== null && progress >= toNext; toNext = summonsToNext(level)) {
      progress -= toNext;
      level += 1;
    }
  }

  const rewards = rewardsBetween(from, summonPosition(level, progress));
  const gifts = rewards.reduce((sum, reward) => sum + reward.mythicG1, 0);
  if (gifts) drawn[MYTHIC_G1] = (drawn[MYTHIC_G1] ?? 0) + gifts;

  return { state: { level, progress }, drawn, summons, rewards };
}

/* ------------------------------------------------------------ Awakening */

/**
 * What Mythic Grade 1 weapons and accessories are for: awakening the Immortal one, star by star to 30. Most stars
 * take one, the three stars that change its look take four, and the last stars take light shards, which come from
 * breaking Mythic Grade 1 gear.
 */
export const MAX_AWAKENING_STAR = 30;
/** Stars whose look changes, each taking four Mythic Grade 1. */
export const LOOK_CHANGE_STARS = [6, 12, 18];
const LOOK_CHANGE_MYTHIC = 4;
/** Stars paid for in light shards alone. */
const SHARD_ONLY_STARS: Record<number, number> = { 24: 10_000, 30: 10_000 };
/** Stars taking a Mythic Grade 1 and light shards together. */
const SHARDS_WITH_MYTHIC = { from: 25, to: 29, shards: 1_000 };

export type AwakeningCost = { mythicG1: number; shards: number };

/** What the step to this star costs (star 1 is the first awakening, 30 the last). */
export function awakeningStepCost(star: number): AwakeningCost {
  const whole = Math.floor(star);
  if (whole < 1 || whole > MAX_AWAKENING_STAR) return { mythicG1: 0, shards: 0 };
  if (SHARD_ONLY_STARS[whole]) return { mythicG1: 0, shards: SHARD_ONLY_STARS[whole] };
  if (whole >= SHARDS_WITH_MYTHIC.from && whole <= SHARDS_WITH_MYTHIC.to) return { mythicG1: 1, shards: SHARDS_WITH_MYTHIC.shards };
  return { mythicG1: LOOK_CHANGE_STARS.includes(whole) ? LOOK_CHANGE_MYTHIC : 1, shards: 0 };
}

/** Everything the stars from one awakening to another take together. */
export function awakeningCost(from: number, to: number): AwakeningCost {
  const cost = { mythicG1: 0, shards: 0 };
  for (let star = Math.max(0, Math.floor(from)) + 1; star <= Math.min(MAX_AWAKENING_STAR, Math.floor(to)); star += 1) {
    const step = awakeningStepCost(star);
    cost.mythicG1 += step.mythicG1;
    cost.shards += step.shards;
  }
  return cost;
}

/** How far the Mythic Grade 1 gear and light shards in hand awaken it, and what the next star still needs. */
export function awakeningReach(from: number, mythicG1: number, shards: number) {
  let star = Math.max(0, Math.min(MAX_AWAKENING_STAR, Math.floor(from)));
  let mythicLeft = Math.max(0, Math.floor(mythicG1));
  let shardsLeft = Math.max(0, Math.floor(shards));
  while (star < MAX_AWAKENING_STAR) {
    const step = awakeningStepCost(star + 1);
    if (step.mythicG1 > mythicLeft || step.shards > shardsLeft) break;
    mythicLeft -= step.mythicG1;
    shardsLeft -= step.shards;
    star += 1;
  }
  const next = star < MAX_AWAKENING_STAR ? awakeningStepCost(star + 1) : null;
  return {
    star,
    stars: star - Math.max(0, Math.floor(from)),
    mythicLeft,
    shardsLeft,
    next,
    /** What the next star is still short of. */
    short: next ? { mythicG1: Math.max(0, next.mythicG1 - mythicLeft), shards: Math.max(0, next.shards - shardsLeft) } : null,
  };
}

/** Every grade name a summon can give, best first: "Mythic 1" down to "Common 4". */
export function summonGrades(): string[] {
  return [...SUMMON_RARITIES]
    .reverse()
    .flatMap((rarity) => GRADE_CHANCES.map((entry) => entry.grade).sort((a, b) => a - b).map((grade) => `${rarity} ${grade}`));
}
