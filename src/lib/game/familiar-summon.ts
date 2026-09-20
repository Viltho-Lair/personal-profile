/**
 * Familiar summoning, and the diamonds it takes to star up a familiar.
 *
 * A summon draws a star rating by the game's Familiar Summon Rate screen (0★ to 8★), then one of the twelve
 * familiars at random. Every 300 summons the Summon Bonus hands over a random 6★ familiar.
 *
 * Combining: the familiar being raised goes in with up to {@link COMBINE_SLOTS} others at the same star. Each one
 * fills the combine bar by its own chance — another copy of the same familiar ("self") by the full rate, a
 * different familiar of its group ("same type") by half — and the combine succeeds once the bar reaches 100%.
 * Every 300 combines the Combine Bonus hands over a 7★ familiar you pick.
 *
 * The three groups are Attribute (Hi, Ti, A, Je), Battle (Pe, Ku, Sha, Po) and Weapon (Mus, Na, Rion, Ru). Only
 * the goal's own group is worth anything to it, so the other eight familiars are summoned and left.
 *
 * Combining reaches 10★. The 11th star takes a special awakening instead, so it isn't priced here.
 */

/** Chance of each star per summon, in percent, 0★ first, as the Probabilities screen lists them. */
export const FAMILIAR_SUMMON_CHANCES: readonly number[] = [52.28, 26.12, 12.74, 5.2, 2.14, 1.21, 0.23, 0.07, 0.01];

/** The best star a summon can give. */
export const MAX_SUMMON_STAR = FAMILIAR_SUMMON_CHANCES.length - 1;
/** The highest star combining reaches. */
export const MAX_COMBINE_STAR = 10;
/** 11★ exists, but it takes a special awakening rather than a combine. */
export const MAX_FAMILIAR_STAR = 11;
/** Fodder slots in one combine, beside the familiar being raised. */
export const COMBINE_SLOTS = 5;

/** Familiars in a group, and in the game. */
export const GROUP_SIZE = 4;
export const ROSTER_SIZE = 12;

/**
 * What one fodder familiar of the same familiar ("self") adds to the combine bar, in percent, for the step from
 * that star to the next. A different familiar of the same group adds half as much.
 */
export const SELF_CHANCES: readonly number[] = [100, 50, 50, 50, 50, 50, 50, 25, 25, 100];

export const selfChance = (star: number) => SELF_CHANCES[star] ?? 0;
export const sameChance = (star: number) => selfChance(star) / 2;

export const FAMILIAR_SUMMON_COSTS: readonly { summons: number; diamonds: number }[] = [
  { summons: 1, diamonds: 500 },
  { summons: 11, diamonds: 5000 },
];
/** The bundle of 11 is the cheaper way: 454.5 diamonds a summon against 500. */
export const FAMILIAR_BATCH = FAMILIAR_SUMMON_COSTS[1]!;

/** Every this many summons, the bonus bar gives a random familiar at this star. */
export const SUMMON_BONUS = { every: 300, star: 6 };
/** Every this many combines, the bonus bar gives a familiar you pick at this star. */
export const COMBINE_BONUS = { every: 300, star: 7 };

/** A combine's fodder: copies of the familiar itself, and other familiars of its group. */
export type Fodder = { self: number; same: number };

/** How far a fodder set fills the combine bar for the step up from `star`, in percent. */
export const fodderBar = (star: number, fodder: Fodder) =>
  fodder.self * selfChance(star) + fodder.same * sameChance(star);

/**
 * The fodder sets that fill the bar for this step and waste nothing: dropping any one of them would leave the
 * combine short. 7★ and 8★ can't be filled by same type alone — five of those only reach 62.5% — so those two
 * steps always take copies of the familiar itself.
 */
export function fodderSets(star: number): Fodder[] {
  const sets: Fodder[] = [];
  for (let self = 0; self <= COMBINE_SLOTS; self += 1) {
    for (let same = 0; self + same <= COMBINE_SLOTS; same += 1) {
      if (fodderBar(star, { self, same }) < 100) continue;
      if (self > 0 && fodderBar(star, { self: self - 1, same }) >= 100) continue;
      if (same > 0 && fodderBar(star, { self, same: same - 1 }) >= 100) continue;
      sets.push({ self, same });
    }
  }
  return sets;
}

/** The fodder a step takes in copies of the familiar itself, with no help from its group. */
export const selfOnlyFodder = (star: number) => Math.ceil(100 / selfChance(star));

/**
 * What a familiar at each star is worth in copies of itself at 0★, fed nothing but its own copies: the fewest
 * familiars a star can cost. 10★ is 72,900 of them, which is why the rest of the group matters so much.
 */
export const STAR_COST: readonly number[] = Array.from({ length: MAX_COMBINE_STAR + 1 }, (_, star) => {
  let cost = 1;
  for (let n = 0; n < star; n += 1) cost *= 1 + selfOnlyFodder(n);
  return cost;
});

/* ------------------------------------------------------------ Summoning */

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

/** One summon: a star by the chances, then one of the familiars. */
export function drawFamiliar(names: readonly string[], random: () => number): { name: string; star: number } {
  const star = pickIndex(FAMILIAR_SUMMON_CHANCES, random());
  return { name: pickOne(names, random()), star };
}

/**
 * A summoning run, apart from the profile: the copies in hand of every familiar at every star, the summons and
 * combines made, and the diamonds they cost.
 */
export type FamiliarSim = {
  /** Copies held, by familiar name, indexed by star. */
  copies: Record<string, number[]>;
  summons: number;
  combines: number;
  diamonds: number;
};

const starRow = () => Array.from({ length: MAX_FAMILIAR_STAR + 1 }, () => 0);

export const emptyFamiliarSim = (names: readonly string[]): FamiliarSim => ({
  copies: Object.fromEntries(names.map((name) => [name, starRow()])),
  summons: 0,
  combines: 0,
  diamonds: 0,
});

const cloneSim = (sim: FamiliarSim): FamiliarSim => ({
  ...sim,
  copies: Object.fromEntries(Object.entries(sim.copies).map(([name, row]) => [name, [...row]])),
});

export type FamiliarRun = {
  sim: FamiliarSim;
  /** What came out, by familiar and star. */
  drawn: Record<string, number[]>;
  /** The random 6★ familiars the summon bonus gave along the way. */
  bonuses: string[];
};

/** Summons `count` times for `diamonds`, with the summon bonus landing on every 300th summon of the run. */
export function summonFamiliars(
  sim: FamiliarSim,
  count: number,
  diamonds: number,
  names: readonly string[],
  random: () => number = Math.random,
): FamiliarRun {
  const next = cloneSim(sim);
  const drawn: Record<string, number[]> = {};
  const bonuses: string[] = [];
  const add = (name: string, star: number) => {
    next.copies[name]![star]! += 1;
    (drawn[name] ??= starRow())[star]! += 1;
  };
  for (let i = 1; i <= count; i += 1) {
    const draw = drawFamiliar(names, random);
    add(draw.name, draw.star);
    if ((sim.summons + i) % SUMMON_BONUS.every === 0) {
      const bonus = pickOne(names, random());
      add(bonus, SUMMON_BONUS.star);
      bonuses.push(bonus);
    }
  }
  next.summons += count;
  next.diamonds += diamonds;
  return { sim: next, drawn, bonuses };
}

/** The 7★ copies the combine bonus bar has handed over by this many combines. */
export const combineBonusesBy = (combines: number) => Math.floor(Math.max(0, combines) / COMBINE_BONUS.every);

/**
 * Combines one copy of `name` up a star, taking its fodder from the copies in hand: the plan's own copies first,
 * then others of its group. Null when the fodder isn't there, or when it's as high as combining goes.
 */
export function combineOnce(
  sim: FamiliarSim,
  name: string,
  star: number,
  group: readonly string[],
  fodder: Fodder,
): FamiliarSim | null {
  if (star >= MAX_COMBINE_STAR || fodderBar(star, fodder) < 100) return null;
  const kin = group.filter((member) => member !== name);
  if ((sim.copies[name]?.[star] ?? 0) < 1 + fodder.self) return null;
  if (kin.reduce((sum, member) => sum + (sim.copies[member]?.[star] ?? 0), 0) < fodder.same) return null;

  const next = cloneSim(sim);
  next.copies[name]![star]! -= 1 + fodder.self;
  let left = fodder.same;
  for (const member of kin) {
    const take = Math.min(left, next.copies[member]![star]!);
    next.copies[member]![star]! -= take;
    left -= take;
  }
  next.copies[name]![star + 1]! += 1;
  next.combines += 1;
  return next;
}

/**
 * The fodder set to use for the step up from `star`, given what's in hand: the one leaning hardest on the rest of
 * the group, since their copies are worth nothing else, and more of the familiar's own copies only as the group
 * runs out. Null when the hand can't fill the bar at all.
 *
 * The group's copies are never combined up a star of their own: raising one costs exactly what raising a copy of
 * the familiar itself costs, and it is only worth half as much in the slot, so a spare star is always better spent
 * on the familiar. That leaves them as fodder at the star they were summoned at, and nothing else.
 */
export function pickFodder(star: number, own: number, kin: number): Fodder | null {
  for (const set of fodderSets(star)) if (own >= 1 + set.self && kin >= set.same) return set;
  return null;
}

/** A small seeded random number generator, so an estimate comes out the same every time. */
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

/** What one run came to. */
export type FamiliarPlay = { summons: number; combines: number };

/** Summons a run may make before it's given up on. */
const RUN_LIMIT = 4_000_000;

/**
 * One run to carry a familiar from `from` to `to`: summoning, and combining everything in hand from the bottom up
 * after each one. Copies of the goal familiar are one summon in twelve, the other three of its group three in
 * twelve, and the remaining eight are no use to it at all.
 *
 * Both bonus bars count: a random familiar at 6★ every 300 summons, and a 7★ of the goal every 300 combines,
 * since that one is picked.
 */
export function playFamiliar(from: number, to: number, random: () => number): FamiliarPlay {
  const own = Array.from({ length: MAX_COMBINE_STAR + 2 }, () => 0);
  const kin = Array.from({ length: MAX_SUMMON_STAR + 1 }, () => 0);
  own[Math.min(Math.max(0, from), to)]! += 1;

  let summons = 0;
  let combines = 0;
  let picked = 0;

  /**
   * Combines upward from the star a copy just landed on. A combine takes copies at one star and gives one at the
   * next, so it can never open up a combine lower down: starting where the copy landed catches every one of them.
   */
  const cascade = (from: number) => {
    for (let star = from; star < to; ) {
      const set = pickFodder(star, own[star]!, star <= MAX_SUMMON_STAR ? kin[star]! : 0);
      if (!set) return;
      own[star]! -= 1 + set.self;
      if (star <= MAX_SUMMON_STAR) kin[star]! -= set.same;
      own[star + 1]! += 1;
      combines += 1;
      star += 1;
      const earned = Math.floor(combines / COMBINE_BONUS.every);
      if (earned > picked) {
        own[COMBINE_BONUS.star]! += earned - picked;
        picked = earned;
        if (COMBINE_BONUS.star < star) star = COMBINE_BONUS.star;
      }
    }
  };

  const give = (who: number, star: number) => {
    if (who === 0) own[star]! += 1;
    else if (who < GROUP_SIZE) kin[star]! += 1;
    else return;
    cascade(star);
  };

  while (own[to]! < 1 && summons < RUN_LIMIT) {
    summons += 1;
    give(Math.floor(random() * ROSTER_SIZE), pickIndex(FAMILIAR_SUMMON_CHANCES, random()));
    if (summons % SUMMON_BONUS.every === 0) give(Math.floor(random() * ROSTER_SIZE), SUMMON_BONUS.star);
  }
  return { summons, combines };
}

/** Diamonds for that many summons, bought in bundles of eleven. */
export const diamondsFor = (summons: number) =>
  Math.ceil(Math.max(0, summons) / FAMILIAR_BATCH.summons) * FAMILIAR_BATCH.diamonds;

/**
 * Runs an estimate averages over, the fewest it settles for on a long goal, and the summons it spends over all of
 * them. A 10★ run is tens of thousands of summons, so it trades runs for the wait.
 */
export const ESTIMATE_RUNS = 600;
const LEAST_RUNS = 60;
const RUN_BUDGET = 4_000_000;

export type FamiliarEstimate = {
  /** Where it starts and where it's going. */
  from: number;
  to: number;
  /** Runs it was averaged over. */
  runs: number;
  /** Summons on average, the bundles of 11 they come in, and the diamonds those cost. */
  summons: number;
  batches: number;
  diamonds: number;
  /** Combines along the way, and the 7★ familiars their bonus bar gives back. */
  combines: number;
  combineBonuses: number;
  /** Random 6★ familiars the summon bonus bar gives, any of the twelve alike. */
  summonBonuses: number;
  /** Copies of the goal familiar summoned on the way, at any star: one summon in twelve. */
  copies: number;
  /** What the goal is worth in copies of itself at 0★, if it were only ever fed its own copies. */
  ownCopies: number;
  /** The summons half the runs, and nine in ten runs, were done by. */
  median: { summons: number; diamonds: number };
  likely: { summons: number; diamonds: number };
};

/**
 * What carrying one familiar from `from` to `to` takes, averaged over up to {@link ESTIMATE_RUNS} runs of
 * {@link playFamiliar}.
 *
 * It comes out the same for any familiar, since every group has four members and every familiar is summoned as
 * often as the others.
 */
/** Estimates already made: a goal is hundreds of runs, and it only depends on the two stars. */
const ESTIMATES = new Map<string, FamiliarEstimate>();

export function estimateFamiliar(from: number, to: number): FamiliarEstimate {
  const start = Math.max(0, Math.min(MAX_COMBINE_STAR, Math.floor(from) || 0));
  const goal = Math.max(start, Math.min(MAX_COMBINE_STAR, Math.floor(to) || 0));
  const known = ESTIMATES.get(`${start}:${goal}`);
  if (known) return known;
  const empty = {
    from: start,
    to: goal,
    runs: 0,
    summons: 0,
    batches: 0,
    diamonds: 0,
    combines: 0,
    combineBonuses: 0,
    summonBonuses: 0,
    copies: 0,
    ownCopies: STAR_COST[goal]!,
    median: { summons: 0, diamonds: 0 },
    likely: { summons: 0, diamonds: 0 },
  };
  const keep = (estimate: FamiliarEstimate) => {
    ESTIMATES.set(`${start}:${goal}`, estimate);
    return estimate;
  };
  if (goal <= start) return keep(empty);

  const random = seeded(start * 1_000_003 + goal * 7919 + 13);
  const first = playFamiliar(start, goal, random);
  // A long goal takes tens of thousands of summons a run, so the estimate settles for fewer of them.
  const runs = Math.max(1, Math.min(ESTIMATE_RUNS, Math.max(LEAST_RUNS, Math.round(RUN_BUDGET / Math.max(1, first.summons)))));
  const results = [first, ...Array.from({ length: runs - 1 }, () => playFamiliar(start, goal, random))];
  const sorted = results.map((play) => play.summons).sort((a, b) => a - b);
  const at = (odds: number) => {
    const summons = sorted[Math.min(runs - 1, Math.ceil(odds * runs) - 1)]!;
    return { summons, diamonds: diamondsFor(summons) };
  };

  const summons = Math.round(results.reduce((sum, play) => sum + play.summons, 0) / runs);
  const combines = Math.round(results.reduce((sum, play) => sum + play.combines, 0) / runs);
  return keep({
    ...empty,
    runs,
    summons,
    batches: Math.ceil(summons / FAMILIAR_BATCH.summons),
    diamonds: diamondsFor(summons),
    combines,
    combineBonuses: Math.floor(combines / COMBINE_BONUS.every),
    summonBonuses: Math.floor(summons / SUMMON_BONUS.every),
    copies: Math.round(summons / ROSTER_SIZE),
    median: at(0.5),
    likely: at(0.9),
  });
}

/**
 * Combines everything in hand as far as it goes, star by star from the bottom up, leaning on the rest of the
 * group for every slot they can fill. Nothing is lost doing it, and the group's copies are never taken up a star
 * of their own — see {@link pickFodder}.
 */
export function combineUp(
  sim: FamiliarSim,
  name: string,
  group: readonly string[],
  to: number = MAX_COMBINE_STAR,
): FamiliarSim {
  let current = sim;
  const kinAt = (star: number) =>
    group.reduce((sum, member) => (member === name ? sum : sum + (current.copies[member]?.[star] ?? 0)), 0);

  for (let star = 0; star < Math.min(to, MAX_COMBINE_STAR); star += 1) {
    for (;;) {
      const set = pickFodder(star, current.copies[name]?.[star] ?? 0, kinAt(star));
      const next = set && combineOnce(current, name, star, group, set);
      if (!next) break;
      current = next;
    }
  }
  return current;
}

/** The best copy of a familiar in hand, or null when there is none. */
export function bestStar(sim: FamiliarSim, name: string): number | null {
  const row = sim.copies[name] ?? [];
  for (let star = row.length - 1; star >= 0; star -= 1) if (row[star]! > 0) return star;
  return null;
}
