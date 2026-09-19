/**
 * Class summoning, and the diamonds it takes to own a class.
 *
 * A summon draws a grade by the game's Class Summon Probability screen, and each grade is one class: grade 1 is
 * Trainee, grade 19 Dark Rain. Grade 20 (Blast) shows 0%, so it can't be summoned. The class summon reward bar
 * gives a grade 19 class every 3,000 summons, whatever the summons drew in between.
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
/** Every this many summons, the reward bar gives a grade 19 class. */
export const CLASS_PITY_EVERY = 3000;
export const CLASS_PITY_GRADE = 19;
/** Seed 5 stars to Nova. */
export const NOVA_SHARDS = 10_000;

export const CLASS_SINGLE = { summons: 1, diamonds: 300 };
/** The bundle: 10 summons and the bonus for 3,000 diamonds. The bonus grows with the summon level. */
export const CLASS_BUNDLE_DIAMONDS = 3000;
export const CLASS_BUNDLE_BASE = 10;
export const bundleOf = (bonus: number) => ({
  summons: CLASS_BUNDLE_BASE + Math.max(0, Math.floor(bonus)),
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

export type ClassSim = {
  /** Copies summoned of each grade, grade 1 at index 0. */
  owned: number[];
  summons: number;
  diamonds: number;
  /** Summons on the reward bar, 0 to 2,999. */
  pity: number;
};

export const emptyClassSim = (pity = 0): ClassSim => ({
  owned: Array(CLASS_SUMMON_GRADES).fill(0),
  summons: 0,
  diamonds: 0,
  pity: clampPity(pity),
});

export const clampPity = (pity: number) => Math.min(CLASS_PITY_EVERY - 1, Math.max(0, Math.floor(pity || 0)));

/** Summons `count` classes for `diamonds`; the reward bar pays out a grade 19 as it fills. */
export function summonClasses(sim: ClassSim, count: number, diamonds: number, random: () => number = Math.random) {
  const owned = [...sim.owned];
  const drawn: number[] = Array(CLASS_SUMMON_GRADES).fill(0);
  let pity = sim.pity;
  let rewards = 0;
  for (let i = 0; i < count; i++) {
    const grade = rollGrade(random());
    owned[grade - 1]!++;
    drawn[grade - 1]!++;
    if (++pity >= CLASS_PITY_EVERY) {
      pity = 0;
      rewards++;
      owned[CLASS_PITY_GRADE - 1]!++;
      drawn[CLASS_PITY_GRADE - 1]!++;
    }
  }
  return {
    sim: { owned, summons: sim.summons + count, diamonds: sim.diamonds + diamonds, pity },
    drawn,
    rewards,
  };
}

/** Summons left until the reward bar pays out a grade 19, or Infinity for grades it doesn't give. */
const pityIn = (grade: number, pity: number) => (grade === CLASS_PITY_GRADE ? CLASS_PITY_EVERY - clampPity(pity) : Infinity);

/** Average summons to own a class of `grade`, with the reward bar at `pity`. */
export function expectedSummons(grade: number, pity = 0): number {
  const p = chance(grade);
  const cap = pityIn(grade, pity);
  if (p <= 0) return cap;
  // Sum over k < cap of P(no copy in the first k summons).
  return Number.isFinite(cap) ? (1 - (1 - p) ** cap) / p : 1 / p;
}

/** Summons that give a class of `grade` with the chance `odds` (0.5 is the median); capped by the reward bar. */
export function summonsForOdds(grade: number, odds: number, pity = 0): number {
  const p = chance(grade);
  const cap = pityIn(grade, pity);
  if (p <= 0) return cap;
  return Math.min(cap, Math.ceil(Math.log(1 - odds) / Math.log(1 - p)));
}

/** Diamonds for that many summons, bought in bundles (an average, so part bundles count pro rata). */
export const diamondsFor = (summons: number, bonus: number) => {
  const bundle = bundleOf(bonus);
  return (summons / bundle.summons) * bundle.diamonds;
};

/** "Nova" or a grade 1-19. Nova rests on Dark Rain; the steps after it aren't priced yet. */
export type ClassGoal = number | "nova";
export const goalGrade = (goal: ClassGoal) => (goal === "nova" ? CLASS_PITY_GRADE : goal);

export function estimateClass(goal: ClassGoal, bonus: number, pity = 0) {
  const grade = goalGrade(goal);
  const summons = expectedSummons(grade, pity);
  const at = (odds: number) => {
    const n = summonsForOdds(grade, odds, pity);
    return { summons: n, diamonds: diamondsFor(n, bonus) };
  };
  return {
    grade,
    summons,
    diamonds: diamondsFor(summons, bonus),
    median: at(0.5),
    likely: at(0.9),
    shards: goal === "nova" ? NOVA_SHARDS : 0,
  };
}
