/**
 * Spirit summoning, and what it takes to raise a spirit to Ancient.
 *
 * A summon draws a grade by the game's Probabilities screen (Common to Legendary), then one of the spirits at
 * random. Every 300 summons the bonus offers two random Epic spirits to pick one from.
 *
 * Raising a spirit:
 * - Common to Legendary: four copies of the same spirit make one of the next grade (one takes in three more).
 * - Legendary, Mythic and Immortal each have five stars, A0 to A5: 1 of the same spirit, 2 of the same element,
 *   1 same spirit, 2 same element, 1 same spirit.
 * - A5 to the next grade takes 3 of the same element; Immortal A5 to Ancient takes 1 of the same spirit and
 *   1,000 light shards instead.
 *
 * Every step from Legendary A0 on, up to Ancient, is paid in Legendary spirits. "Same element" fodder can be any
 * spirit of that element, the spirit itself included.
 */

export const SPIRIT_GRADES = ["Common", "Great", "Rare", "Epic", "Legendary", "Mythic", "Immortal", "Ancient"] as const;
export type SpiritGrade = (typeof SPIRIT_GRADES)[number];

export const EPIC = 3;
export const LEGENDARY = 4;
export const IMMORTAL = 6;
export const ANCIENT = 7;
/** Grades a summon can give: Common to Legendary. */
export const SUMMON_GRADES = SPIRIT_GRADES.slice(0, LEGENDARY + 1);

/** Chance of each grade per summon, in percent, as the game lists them. */
export const SPIRIT_SUMMON_CHANCES: readonly number[] = [89.55, 8.2, 1.4, 0.7, 0.15];

export const SPIRIT_SUMMON_COSTS: readonly { summons: number; diamonds: number }[] = [
  { summons: 1, diamonds: 500 },
  { summons: 11, diamonds: 5000 },
];
/** The bundle of 11 is the cheaper way: 454.5 diamonds a summon. */
export const SPIRIT_BATCH = SPIRIT_SUMMON_COSTS[1]!;

/** Every this many summons the bonus offers this many random Epic spirits to pick one from. */
export const SPIRIT_BONUS_EVERY = 300;
export const SPIRIT_BONUS_OPTIONS = 2;

/** Copies of one grade that make one of the next, Common to Legendary. */
export const COMBINE_COUNT = 4;
export const MAX_STAR = 5;
/** Fodder for every star and step up past Legendary A0 is a Legendary spirit, whatever the grade being raised. */
export const FODDER_GRADE = LEGENDARY;
/** What each star (A0 -> A1 first) takes, in Legendary spirits. */
export const STAR_STEPS: readonly { from: "spirit" | "element"; count: number }[] = [
  { from: "spirit", count: 1 },
  { from: "element", count: 2 },
  { from: "spirit", count: 1 },
  { from: "element", count: 2 },
  { from: "spirit", count: 1 },
];
/** A5 to the next grade, Legendary and Mythic. */
export const GRADE_STEP_ELEMENT = 3;
/** Immortal A5 to Ancient. */
export const ANCIENT_STEP = { spirit: 1, shards: 1000 };

/** Epic spirits an element switch takes: to an element you pick, or a random one. Either way progress is lost. */
export const SWITCH_COST = { chosen: 2, random: 1 };

/** A spirit's grade (index into SPIRIT_GRADES) and stars (Legendary to Immortal only). */
export type Rank = { grade: number; star: number };
export type Roster = readonly { name: string; element: string | null }[];

export const rankLabel = (rank: Rank) =>
  rank.grade >= LEGENDARY && rank.grade < ANCIENT ? `${SPIRIT_GRADES[rank.grade]} A${rank.star}` : SPIRIT_GRADES[rank.grade]!;

/** Every rank from Common to Ancient, weakest first. */
export const SPIRIT_RANKS: readonly Rank[] = SPIRIT_GRADES.flatMap((_, grade) =>
  grade >= LEGENDARY && grade < ANCIENT
    ? Array.from({ length: MAX_STAR + 1 }, (_, star) => ({ grade, star }))
    : [{ grade, star: 0 }],
);

export const rankIndex = (rank: Rank) =>
  SPIRIT_RANKS.findIndex((entry) => entry.grade === rank.grade && entry.star === rank.star);
export const rankAtLeast = (rank: Rank | null, goal: Rank) => rank !== null && rankIndex(rank) >= rankIndex(goal);

/* --------------------------------------------------------------- Averages */

/**
 * What something takes, in Legendary A0 spirits: `spirit` has to be the spirit itself, `element` can be any spirit
 * of its element. A Common is 1/256 of a Legendary, since four of each grade make one of the next.
 */
export type Need = { spirit: number; element: number; shards: number };

const add = (a: Need, b: Need, times = 1): Need => ({
  spirit: a.spirit + b.spirit * times,
  element: a.element + b.element * times,
  shards: a.shards + b.shards * times,
});
/** One spirit at A0 of this grade, built from nothing. */
export const copyNeed = (grade: number): Need => rankNeed({ grade, star: 0 });

/**
 * One spirit at this rank, built from nothing: combined up to Legendary A0, then every star and step up paid in
 * Legendaries. Ancient from nothing is 11 Legendaries of itself, 18 of its element and 1,000 light shards.
 */
export function rankNeed(rank: Rank): Need {
  if (rank.grade < LEGENDARY) return { spirit: COMBINE_COUNT ** (rank.grade - LEGENDARY), element: 0, shards: 0 };
  let need: Need = { spirit: 1, element: 0, shards: 0 };
  const target = rankIndex(rank);
  for (let current: Rank = { grade: LEGENDARY, star: 0 }; rankIndex(current) < target; ) {
    const step = nextStep(current)!;
    need = add(need, { spirit: step.spirit, element: step.element, shards: step.shards });
    current = step.rank;
  }
  return need;
}

/** Legendary A0 spirits one summon gives on average, all spirits together: about 1/112. */
export const LEGENDARY_PER_SUMMON = SPIRIT_SUMMON_CHANCES.reduce(
  (sum, chance, grade) => sum + (chance / 100) * copyNeed(grade).spirit,
  0,
);

export type SpiritGoal = { name: string; rank: Rank };

export type SpiritEstimate = {
  /** Summons on average, the bundles of 11 they come in and the diamonds those cost. */
  summons: number;
  batches: number;
  diamonds: number;
  shards: number;
  /** What each goal takes from nothing, in Legendary A0 spirits. */
  goals: (SpiritGoal & { need: Need; element: string | null })[];
  /** The goal or element that sets the count: the one that runs out last. */
  limit: string | null;
};

/** Chance at least one of the bonus's two distinct options is among `wanted` spirits, out of `total`. */
function bonusHit(wanted: number, total: number): number {
  if (wanted <= 0 || total < SPIRIT_BONUS_OPTIONS) return 0;
  const miss = ((total - wanted) / total) * ((total - wanted - 1) / (total - 1));
  return 1 - Math.max(0, miss);
}

/**
 * How many summons, on average, raise every goal from nothing. Summons are shared, so it's the slowest need that
 * decides: each goal's own copies (1/12 of what's summoned) and each element's total (3/12 of it). The bonus pick
 * goes to a goal spirit or goal element whenever one is offered.
 */
export function estimateSpirits(goals: readonly SpiritGoal[], roster: Roster): SpiritEstimate {
  const count = roster.length;
  const elementOf = (name: string) => roster.find((spirit) => spirit.name === name)?.element ?? null;
  const detailed = goals.map((goal) => ({ ...goal, need: rankNeed(goal.rank), element: elementOf(goal.name) }));
  const elements = [...new Set(detailed.map((goal) => goal.element))];
  const bonusValue = copyNeed(EPIC).spirit / SPIRIT_BONUS_EVERY;

  let summons = 0;
  let limit: string | null = null;
  const consider = (value: number, label: string) => {
    if (value > summons) {
      summons = value;
      limit = label;
    }
  };

  const spiritRate =
    LEGENDARY_PER_SUMMON / count + (bonusValue * bonusHit(detailed.length, count)) / Math.max(1, detailed.length);
  for (const goal of detailed) consider(goal.need.spirit / spiritRate, goal.name);

  for (const element of elements) {
    const members = roster.filter((spirit) => spirit.element === element).length;
    const wanted = members * elements.length;
    const rate = (LEGENDARY_PER_SUMMON * members) / count + (bonusValue * bonusHit(wanted, count)) / elements.length;
    const total = detailed
      .filter((goal) => goal.element === element)
      .reduce((sum, goal) => sum + goal.need.spirit + goal.need.element, 0);
    consider(total / rate, element ?? "No element");
  }

  const whole = Math.ceil(summons);
  const batches = Math.ceil(whole / SPIRIT_BATCH.summons);
  return {
    summons: whole,
    batches,
    diamonds: batches * SPIRIT_BATCH.diamonds,
    shards: detailed.reduce((sum, goal) => sum + goal.need.shards, 0),
    goals: detailed,
    limit,
  };
}

/* ------------------------------------------------------------- Simulation */

/**
 * A summoning run, apart from the profile: spare copies of every spirit at A0 of each grade, the one copy of each
 * goal spirit being raised, and the light shards to hand.
 */
export type SpiritSim = {
  inventory: Record<string, number[]>;
  mains: Record<string, Rank>;
  shards: number;
};

export const emptySim = (roster: Roster, shards = 0): SpiritSim => ({
  inventory: Object.fromEntries(roster.map((spirit) => [spirit.name, SPIRIT_GRADES.map(() => 0)])),
  mains: {},
  shards,
});

const cloneSim = (sim: SpiritSim): SpiritSim => ({
  inventory: Object.fromEntries(Object.entries(sim.inventory).map(([name, counts]) => [name, [...counts]])),
  mains: { ...sim.mains },
  shards: sim.shards,
});

/** Picks by weight from chances in percent; `roll` is 0-1. */
function pickIndex(chances: readonly number[], roll: number): number {
  const total = chances.reduce((sum, chance) => sum + chance, 0);
  let left = roll * total;
  for (let i = 0; i < chances.length; i += 1) {
    left -= chances[i]!;
    if (left < 0) return i;
  }
  return chances.length - 1;
}

const pickOne = <T>(list: readonly T[], roll: number): T => list[Math.min(list.length - 1, Math.floor(roll * list.length))]!;

/** One summon: a grade by the chances, then a spirit. */
export function drawSpirit(roster: Roster, random: () => number): { name: string; grade: number } {
  const grade = pickIndex(SPIRIT_SUMMON_CHANCES, random());
  return { name: pickOne(roster, random()).name, grade };
}

export type SpiritRun = {
  sim: SpiritSim;
  /** What came out, per spirit per grade. */
  drawn: Record<string, number[]>;
  /** Bonus picks earned: each a pair of Epic spirits to choose from. */
  bonuses: string[][];
};

/** Two different random spirits for the bonus pick. */
export function bonusOptions(roster: Roster, random: () => number): string[] {
  const names = roster.map((spirit) => spirit.name);
  const options: string[] = [];
  while (options.length < Math.min(SPIRIT_BONUS_OPTIONS, names.length)) {
    const left = names.filter((name) => !options.includes(name));
    options.push(pickOne(left, random()));
  }
  return options;
}

/** Summons `count` times after `done` summons already made, so the bonus lands every 300th. */
export function summonSpirits(
  sim: SpiritSim,
  count: number,
  done: number,
  roster: Roster,
  random: () => number = Math.random,
): SpiritRun {
  const next = cloneSim(sim);
  const drawn: Record<string, number[]> = {};
  const bonuses: string[][] = [];
  for (let i = 1; i <= count; i += 1) {
    const draw = drawSpirit(roster, random);
    next.inventory[draw.name]![draw.grade]! += 1;
    (drawn[draw.name] ??= SPIRIT_GRADES.map(() => 0))[draw.grade]! += 1;
    if ((done + i) % SPIRIT_BONUS_EVERY === 0) bonuses.push(bonusOptions(roster, random));
  }
  return { sim: next, drawn, bonuses };
}

/** Takes the bonus pick: one Epic of that spirit. */
export function takeBonus(sim: SpiritSim, name: string): SpiritSim {
  const next = cloneSim(sim);
  next.inventory[name]![EPIC]! += 1;
  return next;
}

/** Combines every spirit's spares four to one, as far as Legendary goes. Nothing is lost doing it. */
export function combineAll(sim: SpiritSim): SpiritSim {
  const next = cloneSim(sim);
  for (const counts of Object.values(next.inventory)) {
    for (let grade = 0; grade < LEGENDARY; grade += 1) {
      const made = Math.floor(counts[grade]! / COMBINE_COUNT);
      counts[grade]! -= made * COMBINE_COUNT;
      counts[grade + 1]! += made;
    }
  }
  return next;
}

/**
 * Keeps every goal's own copy the best one held: the first copy summoned becomes it, and a better spare swaps in.
 * Spirits no longer a goal hand their copy back as a spare of its grade (stars already paid for are gone).
 */
export function settleMains(sim: SpiritSim, goals: readonly SpiritGoal[]): SpiritSim {
  const next = cloneSim(sim);
  const wanted = new Set(goals.map((goal) => goal.name));
  for (const [name, main] of Object.entries(next.mains)) {
    if (wanted.has(name)) continue;
    next.inventory[name]![main.grade]! += 1;
    delete next.mains[name];
  }
  for (const name of wanted) {
    const counts = next.inventory[name];
    if (!counts) continue;
    let best = -1;
    counts.forEach((count, grade) => {
      if (count > 0) best = grade;
    });
    const main = next.mains[name];
    if (best < 0 || (main && best <= main.grade)) continue;
    counts[best]! -= 1;
    if (main) counts[main.grade]! += 1;
    next.mains[name] = { grade: best, star: 0 };
  }
  return next;
}

/** Where fodder may come from while raising one goal. */
type Plan = {
  roster: Roster;
  /** Element fodder, first choice first: spirits that aren't goals, the spirit itself, then lower goals if allowed. */
  order: string[];
  /** Goals below the one being raised that are allowed as fodder. */
  lower: Set<string>;
};

/** Working state inside one upgrade: the run, and which lower-priority goals gave copies. */
type Work = { sim: SpiritSim; used: string[] };

const cloneWork = (work: Work): Work => ({ sim: cloneSim(work.sim), used: [...work.used] });

/** What this spirit's spares at or below `grade` (Legendary at most) are worth, in Legendary A0. */
function worth(sim: SpiritSim, name: string, grade: number): number {
  const counts = sim.inventory[name] ?? [];
  let total = 0;
  for (let g = 0; g <= Math.min(grade, FODDER_GRADE); g += 1) total += (counts[g] ?? 0) * copyNeed(g).spirit;
  return total;
}

/** A cheap check that combining this copy isn't hopeless, so failing searches stop early. */
const mightMake = (work: Work, name: string, grade: number) => worth(work.sim, name, grade) >= copyNeed(grade).spirit - 1e-9;

const note = (work: Work, name: string, plan: Plan) => {
  if (plan.lower.has(name) && !work.used.includes(name)) work.used.push(name);
};

/**
 * Makes one spare copy of `name` at A0 of `grade` (Legendary at most), combining four of the grade below when
 * there's no spare. False leaves `work` spoiled.
 */
function makeCopy(work: Work, name: string, grade: number, plan: Plan): boolean {
  const counts = work.sim.inventory[name]!;
  if (counts[grade]! > 0) {
    counts[grade]! -= 1;
    note(work, name, plan);
    return true;
  }
  if (grade === 0 || grade > FODDER_GRADE || !mightMake(work, name, grade)) return false;
  for (let i = 0; i < COMBINE_COUNT; i += 1) if (!makeCopy(work, name, grade - 1, plan)) return false;
  return true;
}

/** One spirit of this element at A0 of `grade`: a spare held first, otherwise built, first choice first. */
function makeElement(work: Work, grade: number, plan: Plan): boolean {
  for (const name of plan.order) {
    if ((work.sim.inventory[name]?.[grade] ?? 0) > 0) return makeCopy(work, name, grade, plan);
  }
  for (const name of plan.order) {
    const trial = cloneWork(work);
    if (makeCopy(trial, name, grade, plan)) {
      work.sim = trial.sim;
      work.used = trial.used;
      return true;
    }
  }
  return false;
}

function payStep(work: Work, name: string, grade: number, from: "spirit" | "element", count: number, plan: Plan): boolean {
  for (let i = 0; i < count; i += 1) {
    if (!(from === "spirit" ? makeCopy(work, name, grade, plan) : makeElement(work, grade, plan))) return false;
  }
  return true;
}

/** What the next step up from this rank takes, for showing it. */
export type Step = {
  rank: Rank;
  /** The grade the fodder is: the spirit's own below Legendary, Legendary from then on. */
  fodder: number;
  spirit: number;
  element: number;
  shards: number;
};

export function nextStep(rank: Rank): Step | null {
  const { grade, star } = rank;
  if (grade >= ANCIENT) return null;
  if (grade < LEGENDARY) return { rank: { grade: grade + 1, star: 0 }, fodder: grade, spirit: COMBINE_COUNT - 1, element: 0, shards: 0 };
  const fodder = FODDER_GRADE;
  if (star < MAX_STAR) {
    const step = STAR_STEPS[star]!;
    return {
      rank: { grade, star: star + 1 },
      fodder,
      spirit: step.from === "spirit" ? step.count : 0,
      element: step.from === "element" ? step.count : 0,
      shards: 0,
    };
  }
  if (grade === IMMORTAL) {
    return { rank: { grade: ANCIENT, star: 0 }, fodder, spirit: ANCIENT_STEP.spirit, element: 0, shards: ANCIENT_STEP.shards };
  }
  return { rank: { grade: grade + 1, star: 0 }, fodder, spirit: 0, element: GRADE_STEP_ELEMENT, shards: 0 };
}

export type UpgradeOptions = {
  /** Let a goal lower in the list give its spares to a higher one of the same element. */
  lowerAsFodder: boolean;
};

export type Upgrade = {
  sim: SpiritSim;
  name: string;
  from: Rank;
  to: Rank;
  /** Lower-priority goals whose spares went into it. */
  used: string[];
};

/**
 * Raises one goal's copy a single step (a grade below Legendary, a star, or the step to the next grade), making
 * whatever fodder it needs from the spares. Goals higher in the list are never used as fodder; lower ones only
 * when allowed. Null when it can't be paid for yet, or the goal has no copy or is already there.
 */
export function upgradeGoal(
  sim: SpiritSim,
  goals: readonly SpiritGoal[],
  index: number,
  roster: Roster,
  options: UpgradeOptions,
): Upgrade | null {
  const goal = goals[index];
  if (!goal) return null;
  const settled = settleMains(sim, goals);
  const main = settled.mains[goal.name];
  if (!main || rankAtLeast(main, goal.rank)) return null;
  const step = nextStep(main);
  if (!step) return null;

  const element = roster.find((spirit) => spirit.name === goal.name)?.element ?? null;
  const kin = roster.filter((spirit) => spirit.element === element).map((spirit) => spirit.name);
  const goalNames = goals.map((entry) => entry.name);
  const lower = options.lowerAsFodder ? goalNames.slice(index + 1).filter((name) => kin.includes(name)) : [];
  const plan: Plan = {
    roster,
    order: [...kin.filter((name) => !goalNames.includes(name)), goal.name, ...lower],
    lower: new Set(lower),
  };

  const work: Work = { sim: settled, used: [] };
  // Below Legendary the three copies are of the grade it's at; from Legendary on, every step is paid in Legendaries.
  if (!payStep(work, goal.name, step.fodder, "spirit", step.spirit, plan)) return null;
  if (!payStep(work, goal.name, step.fodder, "element", step.element, plan)) return null;
  if (step.shards) {
    if (work.sim.shards < step.shards) return null;
    work.sim.shards -= step.shards;
  }
  work.sim.mains[goal.name] = step.rank;
  return { sim: work.sim, name: goal.name, from: main, to: step.rank, used: work.used };
}

/** Raises every goal as far as the spares go, first goal first. */
export function upgradeAll(
  sim: SpiritSim,
  goals: readonly SpiritGoal[],
  roster: Roster,
  options: UpgradeOptions,
): { sim: SpiritSim; steps: Upgrade[] } {
  let current = settleMains(sim, goals);
  const steps: Upgrade[] = [];
  for (let index = 0; index < goals.length; index += 1) {
    for (let guard = 0; guard < SPIRIT_RANKS.length; guard += 1) {
      const step = upgradeGoal(current, goals, index, roster, options);
      if (!step) break;
      current = step.sim;
      steps.push(step);
    }
  }
  return { sim: current, steps };
}

export const goalsReached = (sim: SpiritSim, goals: readonly SpiritGoal[]) =>
  goals.length > 0 && goals.every((goal) => rankAtLeast(sim.mains[goal.name] ?? null, goal.rank));

/**
 * Switches Epic spirits to another element: two for one of an element you pick, or one for a random other
 * element. It's the bad kind of fodder: the Epics given up are worth more than the one that comes back.
 */
export function switchElement(
  sim: SpiritSim,
  from: string,
  to: string | "random",
  roster: Roster,
  random: () => number = Math.random,
): { sim: SpiritSim; got: string } | null {
  const cost = to === "random" ? SWITCH_COST.random : SWITCH_COST.chosen;
  if ((sim.inventory[from]?.[EPIC] ?? 0) < cost) return null;
  const own = roster.find((spirit) => spirit.name === from)?.element ?? null;
  const pool = roster.filter((spirit) => (to === "random" ? spirit.element !== own : spirit.element === to));
  if (!pool.length) return null;
  const next = cloneSim(sim);
  next.inventory[from]![EPIC]! -= cost;
  const got = pickOne(pool, random()).name;
  next.inventory[got]![EPIC]! += 1;
  return { sim: next, got };
}
