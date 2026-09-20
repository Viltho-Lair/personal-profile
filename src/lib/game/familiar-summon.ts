/**
 * Familiar summoning, and the diamonds it takes to star up a familiar.
 *
 * A summon draws a star rating by the game's Familiar Summon Rate screen (0★ to 8★), then one of the twelve
 * familiars at random, so a familiar you name is one summon in twelve.
 *
 * Two bonus gauges run alongside, and both hand over a familiar you pick:
 * - The summon gauge fills one a summon, and every 300 gives a 6★.
 * - The combine gauge fills by what a combine used, and every 300 gives a 7★. Only 7★, 8★ and 9★ materials move
 *   it at all; everything below them adds nothing.
 *
 * Combining: the familiar being raised goes in with up to {@link COMBINE_SLOTS} others at the same star. Each one
 * fills the combine bar by its own chance — another copy of the same familiar ("self") by the full rate, a
 * different familiar of its group ("same type") by half — and the combine goes through once the bar reaches 100%.
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

/** The summon gauge: one a summon, and every 300 gives a familiar you pick at this star. */
export const SUMMON_BONUS = { full: 300, star: 6 };
/** The combine gauge: filled by what a combine used, and every 300 gives a familiar you pick at this star. */
export const COMBINE_BONUS = { full: 300, star: 7 };

/**
 * What a combine adds to the combine gauge, by the star of the materials it used. Nothing below 7★ moves it, a
 * 9★ material only pays out when the combine fails, and one successful 7★ combine is already most of a gauge.
 */
export const COMBINE_GAUGE: readonly { fail: number; success: number }[] = [
  { fail: 0, success: 0 }, // 0★
  { fail: 0, success: 0 }, // 1★
  { fail: 0, success: 0 }, // 2★
  { fail: 0, success: 0 }, // 3★
  { fail: 0, success: 0 }, // 4★
  { fail: 0, success: 0 }, // 5★
  { fail: 0, success: 0 }, // 6★
  { fail: 48, success: 516 }, // 7★
  { fail: 172, success: 900 }, // 8★
  { fail: 900, success: 0 }, // 9★
];

export const gaugeFor = (star: number) => COMBINE_GAUGE[star] ?? { fail: 0, success: 0 };

/** A combine's fodder: copies of the familiar itself, and other familiars of its group. */
export type Fodder = { self: number; same: number };

/** How far a fodder set fills the combine bar for the step up from `star`, in percent. */
export const fodderBar = (star: number, fodder: Fodder) =>
  fodder.self * selfChance(star) + fodder.same * sameChance(star);

/**
 * The fodder sets that fill the bar for this step and waste nothing: dropping any one of them would leave the
 * combine short. They come back leaning hardest on the group first.
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
 * Which way the slots are filled.
 *
 * `self` spends nothing but copies of the familiar itself. `same` leans on the rest of its group for every slot
 * they can fill — which is all of them except at 7★ and 8★, where five same type familiars only reach 62.5%, so
 * those two steps take three of its own and two of the group whichever way you go.
 */
export type CombineMode = "self" | "same";
export const COMBINE_MODES: readonly CombineMode[] = ["self", "same"];

/** The fodder set a mode uses for the step up from `star`. */
export function fodderFor(star: number, mode: CombineMode): Fodder {
  const sets = fodderSets(star);
  return (mode === "same" ? sets[0] : sets[sets.length - 1]) ?? { self: selfOnlyFodder(star), same: 0 };
}

/** The fodder set for every step up to `to`, 0★ first. */
export const planFor = (to: number, mode: CombineMode): Fodder[] =>
  Array.from({ length: Math.max(0, to) }, (_, star) => fodderFor(star, mode));

/**
 * What a familiar at each star is worth in copies of itself at 0★, fed nothing but its own copies: the fewest
 * familiars a star can cost. 10★ is 72,900 of them, which is why the bonus gauges matter so much.
 */
export const STAR_COST: readonly number[] = Array.from({ length: MAX_COMBINE_STAR + 1 }, (_, star) => {
  let cost = 1;
  for (let n = 0; n < star; n += 1) cost *= 1 + selfOnlyFodder(n);
  return cost;
});

/**
 * Copies needed at each star to finish the goal: one at the top, and every step below it multiplied by the copies
 * its fodder set takes. `own` is the goal familiar's own copies, `kin` the rest of its group's — which are wanted
 * both as fodder for the goal and to raise the group's own copies to the stars above.
 *
 * They are a ceiling, not a target: nothing is ever combined past what the goal could still need, so a run never
 * grinds copies it has no use for.
 */
export function copiesNeeded(to: number, mode: CombineMode) {
  const plan = planFor(to, mode);
  const own = Array.from({ length: to + 1 }, () => 0);
  const kin = Array.from({ length: to + 1 }, () => 0);
  own[to] = 1;
  for (let star = to - 1; star >= 0; star -= 1) {
    const set = plan[star]!;
    own[star] = own[star + 1]! * (1 + set.self);
    kin[star] = own[star + 1]! * set.same + kin[star + 1]! * (1 + set.self + set.same);
  }
  return { own, kin, plan };
}

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
 * A summoning run, apart from the profile: the copies in hand of every familiar at every star, everything that
 * was summoned along the way, where the combine gauge stands, and the diamonds it has cost.
 */
export type FamiliarSim = {
  /** Copies held, by familiar name, indexed by star. */
  copies: Record<string, number[]>;
  /** Copies summoned, by familiar name and star, gauge picks included: what came in, before any combining. */
  drawn: Record<string, number[]>;
  summons: number;
  combines: number;
  /** The combine gauge, short of its next 300. */
  gauge: number;
  /** Familiars the two gauges have handed over. */
  picks: { summon: number; combine: number };
  diamonds: number;
};

const starRow = () => Array.from({ length: MAX_FAMILIAR_STAR + 1 }, () => 0);
const nameRows = (names: readonly string[]) => Object.fromEntries(names.map((name) => [name, starRow()]));

export const emptyFamiliarSim = (names: readonly string[]): FamiliarSim => ({
  copies: nameRows(names),
  drawn: nameRows(names),
  summons: 0,
  combines: 0,
  gauge: 0,
  picks: { summon: 0, combine: 0 },
  diamonds: 0,
});

const cloneRows = (rows: Record<string, number[]>) =>
  Object.fromEntries(Object.entries(rows).map(([name, row]) => [name, [...row]]));

const cloneSim = (sim: FamiliarSim): FamiliarSim => ({
  ...sim,
  copies: cloneRows(sim.copies),
  drawn: cloneRows(sim.drawn),
  picks: { ...sim.picks },
});

export type FamiliarRun = {
  sim: FamiliarSim;
  /** What came out, by familiar and star. */
  drawn: Record<string, number[]>;
  /** The 6★ the summon gauge handed over along the way, all of them the familiar being raised. */
  bonuses: number;
};

/**
 * Summons `count` times for `diamonds`, with the summon gauge handing `goal` a 6★ on every 300th summon of the
 * run. The gauge lets you choose, so its familiar is always the one being raised.
 */
export function summonFamiliars(
  sim: FamiliarSim,
  count: number,
  diamonds: number,
  names: readonly string[],
  goal: string,
  random: () => number = Math.random,
): FamiliarRun {
  const next = cloneSim(sim);
  const drawn: Record<string, number[]> = {};
  const add = (name: string, star: number) => {
    next.copies[name]![star]! += 1;
    next.drawn[name]![star]! += 1;
    (drawn[name] ??= starRow())[star]! += 1;
  };
  for (let i = 1; i <= count; i += 1) {
    const draw = drawFamiliar(names, random);
    add(draw.name, draw.star);
  }
  next.summons += count;
  next.diamonds += diamonds;
  // Every 300 summons of the run so far, however the bundles happened to fall.
  const bonuses = Math.max(0, Math.floor(next.summons / SUMMON_BONUS.full) - sim.picks.summon);
  for (let i = 0; i < bonuses; i += 1) add(goal, SUMMON_BONUS.star);
  next.picks.summon += bonuses;
  return { sim: next, drawn, bonuses };
}

/**
 * Combines one copy of `name` up a star, taking its fodder from the copies in hand: the familiar's own copies for
 * the self slots, then the rest of its group in the order given for the same type slots. The combine gauge takes
 * what the materials' star is worth, and every 300 of it hands `goal` a 7★.
 *
 * Null when the fodder isn't there, when the set wouldn't fill the bar, or when it's as high as combining goes.
 */
export function combineOnce(
  sim: FamiliarSim,
  name: string,
  star: number,
  group: readonly string[],
  fodder: Fodder,
  goal: string = name,
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

  next.gauge += gaugeFor(star).success;
  while (next.gauge >= COMBINE_BONUS.full) {
    next.gauge -= COMBINE_BONUS.full;
    next.copies[goal]![COMBINE_BONUS.star]! += 1;
    next.picks.combine += 1;
  }
  return next;
}

/**
 * Combines everything in hand as far as it goes, star by star from the bottom up, filling the slots the way the
 * mode says. Nothing is combined past what the goal could still need, so a run never grinds copies it has no use
 * for; in self mode that leaves the rest of the group alone entirely.
 *
 * `group` is in the order its members are fed to the goal, the first one eaten first.
 */
export function combineUp(
  sim: FamiliarSim,
  name: string,
  group: readonly string[],
  mode: CombineMode,
  to: number = MAX_COMBINE_STAR,
): FamiliarSim {
  const goal = Math.min(to, MAX_COMBINE_STAR);
  const { own, kin, plan } = copiesNeeded(goal, mode);
  const order = [name, ...group.filter((member) => member !== name)];
  let current = sim;

  const held = (member: string, star: number) => current.copies[member]?.[star] ?? 0;
  const kinHeld = (star: number) => order.slice(1).reduce((sum, member) => sum + held(member, star), 0);

  for (let star = 0; star < goal; star += 1) {
    const set = plan[star]!;
    // The goal goes first: it has first call on the group's copies at this star.
    while (held(name, star + 1) < (own[star + 1] ?? 0)) {
      const next = combineOnce(current, name, star, order, set, name);
      if (!next) break;
      current = next;
    }
    // Then the group, but only while a star above still wants them.
    if (set.same > 0 && (kin[star + 1] ?? 0) > 0) {
      for (const member of order.slice(1)) {
        while (kinHeld(star + 1) < (kin[star + 1] ?? 0)) {
          const next = combineOnce(current, member, star, order, set, name);
          if (!next) break;
          current = next;
        }
      }
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

/* ------------------------------------------------------------- Estimating */

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

/**
 * How many of `n` summons land on something with a chance of `p`. Rare draws are counted by skipping over the
 * misses, which costs only as much as there are hits; common ones over a long run go by the curve they settle on.
 */
function binomial(n: number, p: number, random: () => number): number {
  if (n <= 0 || p <= 0) return 0;
  if (p >= 1) return n;
  const mean = n * p;
  if (mean < 12) {
    const miss = Math.log(1 - p);
    let count = 0;
    let at = -1;
    for (;;) {
      at += 1 + Math.floor(Math.log(1 - random()) / miss);
      if (at >= n) return count;
      count += 1;
    }
  }
  const spread = Math.sqrt(mean * (1 - p));
  const u = Math.max(1e-12, random());
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
  return Math.max(0, Math.min(n, Math.round(mean + spread * z)));
}

/** What one run came to. */
export type FamiliarPlay = { summons: number; combines: number; picks: { summon: number; combine: number } };

/** Summons a run may make before it's given up on, and how big its batches grow as it drags on. */
export const RUN_LIMIT = 80_000_000;
const MAX_CHUNK = 8192;

/**
 * One run to carry a familiar from `from` to `to`, filling the slots the way `mode` says.
 *
 * Copies of the goal familiar are one summon in twelve and the other three of its group three in twelve, so they
 * are counted as two pools: the group's members are interchangeable as same type fodder, and all three come in as
 * often as each other. Both gauges hand over a familiar you pick, which is always the one being raised.
 *
 * Summons are drawn one at a time while a run is short, where how the copies happen to land still decides it, and
 * in larger batches once it is long enough for them to even out.
 */
export function playFamiliar(from: number, to: number, mode: CombineMode, random: () => number): FamiliarPlay {
  const goal = Math.max(0, Math.min(MAX_COMBINE_STAR, to));
  const start = Math.max(0, Math.min(goal, from));
  if (goal <= start) return { summons: 0, combines: 0, picks: { summon: 0, combine: 0 } };

  const { own: wantOwn, kin: wantKin, plan } = copiesNeeded(goal, mode);
  const own = Array.from({ length: goal + 1 }, () => 0);
  const kin = Array.from({ length: goal + 1 }, () => 0);
  own[start]! += 1;

  let summons = 0;
  let combines = 0;
  let gauge = 0;
  const picks = { summon: 0, combine: 0 };

  const award = (star: number) => {
    gauge += gaugeFor(star).success;
    while (gauge >= COMBINE_BONUS.full) {
      gauge -= COMBINE_BONUS.full;
      own[Math.min(COMBINE_BONUS.star, goal)]! += 1;
      picks.combine += 1;
    }
  };

  while (own[goal]! < 1 && summons < RUN_LIMIT) {
    // A short run turns on single copies, so it is drawn one at a time; a long one evens out and goes in batches.
    // A batch never steps over the summon gauge's next 300, so its 6★ always lands on the summon that earns it.
    const chunk = Math.max(
      1,
      Math.min(MAX_CHUNK, Math.floor(summons / 64), SUMMON_BONUS.full - (summons % SUMMON_BONUS.full)),
    );
    for (let star = 0; star <= MAX_SUMMON_STAR; star += 1) {
      const chance = (FAMILIAR_SUMMON_CHANCES[star] ?? 0) / 100 / ROSTER_SIZE;
      const at = Math.min(star, goal);
      own[at]! += binomial(chunk, chance, random);
      kin[at]! += binomial(chunk, chance * (GROUP_SIZE - 1), random);
    }
    summons += chunk;
    const gauges = Math.floor(summons / SUMMON_BONUS.full) - picks.summon;
    if (gauges > 0) {
      own[Math.min(SUMMON_BONUS.star, goal)]! += gauges;
      picks.summon += gauges;
    }

    // Combine from the bottom up: the goal has first call on the group at each star, and neither pool is taken
    // past what the goal could still need.
    for (let star = 0; star < goal; star += 1) {
      const set = plan[star]!;
      while (own[star]! >= 1 + set.self && kin[star]! >= set.same && own[star + 1]! < wantOwn[star + 1]!) {
        own[star]! -= 1 + set.self;
        kin[star]! -= set.same;
        own[star + 1]! += 1;
        combines += 1;
        award(star);
      }
      const takes = 1 + set.self + set.same;
      while (kin[star]! >= takes && kin[star + 1]! < wantKin[star + 1]!) {
        kin[star]! -= takes;
        kin[star + 1]! += 1;
        combines += 1;
        award(star);
      }
    }
  }
  return { summons, combines, picks };
}

/** Diamonds for that many summons, bought in bundles of eleven. */
export const diamondsFor = (summons: number) =>
  Math.ceil(Math.max(0, summons) / FAMILIAR_BATCH.summons) * FAMILIAR_BATCH.diamonds;

/**
 * Runs an estimate averages over, the fewest it settles for on a long goal, and the summons it spends over all of
 * them. A long run is millions of summons, so it trades runs for the wait.
 */
export const ESTIMATE_RUNS = 400;
const LEAST_RUNS = 24;
const RUN_BUDGET = 3_000_000;

export type FamiliarEstimate = {
  /** Where it starts, where it's going, and how the slots were filled. */
  from: number;
  to: number;
  mode: CombineMode;
  /** Runs it was averaged over. */
  runs: number;
  /** Summons on average, the bundles of 11 they come in, and the diamonds those cost. */
  summons: number;
  batches: number;
  diamonds: number;
  /** Combines along the way. */
  combines: number;
  /** Familiars the two gauges hand over on the way, both of them picked. */
  summonPicks: number;
  combinePicks: number;
  /** Copies of the goal familiar summoned on the way, at any star: one summon in twelve. */
  copies: number;
  /** What the goal is worth in copies of itself at 0★, if it were only ever fed its own copies. */
  ownCopies: number;
  /** Copies the goal takes at each star, and the group's, as the fodder sets add up. */
  needs: { own: number[]; kin: number[]; plan: Fodder[] };
  /** True when a run hit the summons it is allowed before reaching the goal. */
  beyond: boolean;
  /** The summons half the runs, and nine in ten runs, were done by. */
  median: { summons: number; diamonds: number };
  likely: { summons: number; diamonds: number };
};

/** Estimates already made: a goal is hundreds of runs, and it only depends on the two stars and the mode. */
const ESTIMATES = new Map<string, FamiliarEstimate>();

/**
 * What carrying one familiar from `from` to `to` takes, averaged over up to {@link ESTIMATE_RUNS} runs of
 * {@link playFamiliar}.
 *
 * It comes out the same for any familiar, since every group has four members and every familiar is summoned as
 * often as the others.
 */
export function estimateFamiliar(from: number, to: number, mode: CombineMode = "self"): FamiliarEstimate {
  const start = Math.max(0, Math.min(MAX_COMBINE_STAR, Math.floor(from) || 0));
  const goal = Math.max(start, Math.min(MAX_COMBINE_STAR, Math.floor(to) || 0));
  const key = `${start}:${goal}:${mode}`;
  const known = ESTIMATES.get(key);
  if (known) return known;

  const base = {
    from: start,
    to: goal,
    mode,
    runs: 0,
    summons: 0,
    batches: 0,
    diamonds: 0,
    combines: 0,
    summonPicks: 0,
    combinePicks: 0,
    copies: 0,
    ownCopies: STAR_COST[goal]!,
    needs: copiesNeeded(goal, mode),
    beyond: false,
    median: { summons: 0, diamonds: 0 },
    likely: { summons: 0, diamonds: 0 },
  };
  const keep = (estimate: FamiliarEstimate) => {
    ESTIMATES.set(key, estimate);
    return estimate;
  };
  if (goal <= start) return keep(base);

  const random = seeded(start * 1_000_003 + goal * 7919 + (mode === "self" ? 101 : 211));
  const first = playFamiliar(start, goal, mode, random);
  // A long goal takes millions of summons a run, so the estimate settles for fewer of them.
  const runs = Math.max(1, Math.min(ESTIMATE_RUNS, Math.max(LEAST_RUNS, Math.round(RUN_BUDGET / Math.max(1, first.summons)))));
  const results = [first, ...Array.from({ length: runs - 1 }, () => playFamiliar(start, goal, mode, random))];
  const sorted = results.map((play) => play.summons).sort((a, b) => a - b);
  const at = (odds: number) => {
    const summons = sorted[Math.min(runs - 1, Math.ceil(odds * runs) - 1)]!;
    return { summons, diamonds: diamondsFor(summons) };
  };
  const mean = (pick: (play: FamiliarPlay) => number) =>
    Math.round(results.reduce((sum, play) => sum + pick(play), 0) / runs);

  const summons = mean((play) => play.summons);
  return keep({
    ...base,
    runs,
    summons,
    batches: Math.ceil(summons / FAMILIAR_BATCH.summons),
    diamonds: diamondsFor(summons),
    combines: mean((play) => play.combines),
    summonPicks: mean((play) => play.picks.summon),
    combinePicks: mean((play) => play.picks.combine),
    copies: Math.round(summons / ROSTER_SIZE),
    beyond: results.some((play) => play.summons >= RUN_LIMIT),
    median: at(0.5),
    likely: at(0.9),
  });
}
