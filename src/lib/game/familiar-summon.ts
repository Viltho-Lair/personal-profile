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

/** The fodder set a mode uses to fill the bar the whole way for the step up from `star`. */
export function fodderFor(star: number, mode: CombineMode): Fodder {
  const sets = fodderSets(star);
  return (mode === "same" ? sets[0] : sets[sets.length - 1]) ?? { self: selfOnlyFodder(star), same: 0 };
}

/**
 * How far to fill the combine bar before pressing it. Nothing says a combine has to be a certain thing: fewer
 * materials means a smaller chance, more attempts, and the same materials spent per star gained either way — what
 * changes is the gauge, which pays out on a failure too.
 */
export const COMBINE_TARGETS: readonly number[] = [100, 50, 25, 12.5];
export const FULL_BAR = 100;

/**
 * The fewest materials that fill the bar to at least `target`, leaning on the mode's own kind first. A step whose
 * smallest material already overshoots — 0★ and 9★ on self type are 100% from one — simply can't be set lower.
 */
export function fodderAt(star: number, mode: CombineMode, target: number): Fodder {
  const want = Math.max(1e-9, Math.min(FULL_BAR, target));
  const self = selfChance(star);
  const same = sameChance(star);
  if (mode === "self" || same <= 0) {
    return { self: Math.max(1, Math.min(COMBINE_SLOTS, Math.ceil(want / self))), same: 0 };
  }
  // Same type first, and only as many of the familiar's own copies as the five slots force.
  for (let own = 0; own <= COMBINE_SLOTS; own += 1) {
    const room = COMBINE_SLOTS - own;
    const needed = Math.ceil(Math.max(0, want - own * self) / same);
    if (needed <= room) return { self: own, same: Math.max(needed, own === 0 ? 1 : 0) };
  }
  return { self: COMBINE_SLOTS, same: 0 };
}

/** The fodder set for every step up to `to`, 0★ first. */
export const planFor = (to: number, mode: CombineMode, target: number = FULL_BAR): Fodder[] =>
  Array.from({ length: Math.max(0, to) }, (_, star) => fodderAt(star, mode, target));

/** What one step up costs and earns on average, at the fill a mode and target settle on. */
export type CombineOdds = {
  star: number;
  fodder: Fodder;
  /** How far the bar fills, in percent, and so the chance one attempt goes through. */
  bar: number;
  /** Attempts one star takes on average. */
  attempts: number;
  /** Materials one star takes on average: the familiar's own copies, and its group's. */
  materials: { self: number; same: number };
  /** Combine gauge one star earns on average, the failures along the way included. */
  gauge: number;
};

/**
 * What the step up from `star` comes to at this fill.
 *
 * The materials a star costs don't move with the fill: half the chance is twice the attempts on half the
 * materials each. What moves is the gauge, since a failure pays out as well — so the lower the bar is set, the
 * more attempts a star takes and the more gauge those attempts add up to.
 */
export function combineOdds(star: number, mode: CombineMode, target: number): CombineOdds {
  const fodder = fodderAt(star, mode, target);
  const bar = Math.min(FULL_BAR, fodderBar(star, fodder));
  const attempts = bar > 0 ? FULL_BAR / bar : Infinity;
  const { success, fail } = gaugeFor(star);
  return {
    star,
    fodder,
    bar,
    attempts,
    materials: { self: fodder.self * attempts, same: fodder.same * attempts },
    gauge: success + fail * (attempts - 1),
  };
}

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
export function copiesNeeded(to: number, mode: CombineMode, target: number = FULL_BAR) {
  const plan = planFor(to, mode, target);
  const odds = Array.from({ length: Math.max(0, to) }, (_, star) => combineOdds(star, mode, target));
  const own = Array.from({ length: to + 1 }, () => 0);
  const kin = Array.from({ length: to + 1 }, () => 0);
  own[to] = 1;
  for (let star = to - 1; star >= 0; star -= 1) {
    const step = odds[star]!;
    // A star costs one copy of the familiar, which only goes up when the combine does, plus its materials.
    own[star] = own[star + 1]! * (1 + step.materials.self);
    kin[star] = own[star + 1]! * step.materials.same + kin[star + 1]! * (1 + step.materials.self + step.materials.same);
  }
  return { own, kin, plan, odds };
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
 * Tries one combine of `name` at `star`, taking its fodder from the copies in hand: the familiar's own copies for
 * the self slots, then the rest of its group in the order given for the same type slots.
 *
 * The bar the fodder fills is the chance it goes through. It either way spends the materials and adds what that
 * star is worth to the combine gauge — more on a success than a failure — and every 300 of the gauge hands `goal`
 * a 7★. A failure leaves the familiar at the star it was on; only its materials are gone.
 *
 * Null when the fodder isn't there, or when it's as high as combining goes.
 */
export function combineOnce(
  sim: FamiliarSim,
  name: string,
  star: number,
  group: readonly string[],
  fodder: Fodder,
  goal: string = name,
  random: () => number = Math.random,
): FamiliarSim | null {
  const bar = Math.min(FULL_BAR, fodderBar(star, fodder));
  if (star >= MAX_COMBINE_STAR || bar <= 0) return null;
  const kin = group.filter((member) => member !== name);
  if ((sim.copies[name]?.[star] ?? 0) < 1 + fodder.self) return null;
  if (kin.reduce((sum, member) => sum + (sim.copies[member]?.[star] ?? 0), 0) < fodder.same) return null;

  const next = cloneSim(sim);
  const went = random() * FULL_BAR < bar;
  // The materials go whatever happens; the familiar itself only moves when the combine goes through.
  next.copies[name]![star]! -= fodder.self + (went ? 1 : 0);
  let left = fodder.same;
  for (const member of kin) {
    const take = Math.min(left, next.copies[member]![star]!);
    next.copies[member]![star]! -= take;
    left -= take;
  }
  if (went) next.copies[name]![star + 1]! += 1;
  next.combines += 1;

  next.gauge += went ? gaugeFor(star).success : gaugeFor(star).fail;
  while (next.gauge >= COMBINE_BONUS.full) {
    next.gauge -= COMBINE_BONUS.full;
    next.copies[goal]![COMBINE_BONUS.star]! += 1;
    next.picks.combine += 1;
  }
  return next;
}

/**
 * How many copies each star is still short of, worked down from the goal: what is missing above decides what is
 * wanted below. It reads what is in hand every time, so a run that loses materials to a failed combine asks for
 * more rather than stalling against a fixed ceiling.
 */
export function stillWanted(own: readonly number[], kin: readonly number[], to: number, odds: readonly CombineOdds[]) {
  const wantOwn = Array.from({ length: to + 1 }, () => 0);
  const wantKin = Array.from({ length: to + 1 }, () => 0);
  wantOwn[to] = 1;
  for (let star = to - 1; star >= 0; star -= 1) {
    const step = odds[star]!;
    const shortOwn = Math.max(0, wantOwn[star + 1]! - (own[star + 1] ?? 0));
    const shortKin = Math.max(0, wantKin[star + 1]! - (kin[star + 1] ?? 0));
    wantOwn[star] = shortOwn * (1 + step.materials.self);
    wantKin[star] = shortOwn * step.materials.same + shortKin * (1 + step.materials.self + step.materials.same);
  }
  return { wantOwn, wantKin };
}

/**
 * Combines everything in hand for a whole list of goals, star by star from the bottom up, with the goals taking
 * their turn at each star in the order they were given. `spares` is each group's members that aren't goals, in
 * the order they are fed; another goal is never eaten, whatever group it is in.
 *
 * Both gauges hand their familiar to the highest goal that still wants one, which is what priority buys.
 */
export function combineGoals(
  sim: FamiliarSim,
  goals: readonly FamiliarGoal[],
  spares: Record<string, readonly string[]>,
  mode: CombineMode,
  target: number = FULL_BAR,
  random: () => number = Math.random,
): FamiliarSim {
  const list = tidyGoals(goals);
  if (!list.length) return sim;
  const odds = Array.from({ length: MAX_COMBINE_STAR }, (_, star) => combineOdds(star, mode, target));
  const groups = [...new Set(list.map((goal) => goal.group))];
  let current = sim;

  const held = (name: string, star: number) => current.copies[name]?.[star] ?? 0;
  const ownRow = (name: string) => current.copies[name] ?? [];
  const kinRow = (group: string) =>
    Array.from({ length: MAX_COMBINE_STAR + 1 }, (_, star) =>
      (spares[group] ?? []).reduce((sum, member) => sum + held(member, star), 0),
    );
  /** The goal highest up the list that hasn't got there yet, which is where a gauge's familiar goes. */
  const wanting = () =>
    (list.find((goal) => (bestStar(current, goal.name) ?? -1) < goal.to) ?? list[0]!).name;

  for (let star = 0; star < MAX_COMBINE_STAR; star += 1) {
    const set = odds[star]!.fodder;
    for (const goal of list) {
      if (star >= goal.to) continue;
      const order = [goal.name, ...(spares[goal.group] ?? [])];
      const want = stillWanted(ownRow(goal.name), kinRow(goal.group), goal.to, odds).wantOwn[star + 1]!;
      while (held(goal.name, star + 1) < want) {
        const next = combineOnce(current, goal.name, star, order, set, wanting(), random);
        if (!next) break;
        current = next;
      }
    }
    // Then each group's spares, but only as far as the goals leaning on them still want.
    if (set.same > 0) {
      for (const group of groups) {
        const members = spares[group] ?? [];
        if (!members.length) continue;
        const want = list
          .filter((goal) => goal.group === group)
          .reduce(
            (sum, goal) => sum + (stillWanted(ownRow(goal.name), kinRow(group), goal.to, odds).wantKin[star + 1] ?? 0),
            0,
          );
        for (const member of members) {
          while (kinRow(group)[star + 1]! < want) {
            const order = [member, ...members.filter((other) => other !== member)];
            const next = combineOnce(current, member, star, order, set, wanting(), random);
            if (!next) break;
            current = next;
          }
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

/** A familiar to raise, where it starts and where it's going. The list is in priority order, first served first. */
export type FamiliarGoal = { name: string; group: string; from: number; to: number };

/** What one run came to. */
export type FamiliarPlay = {
  summons: number;
  combines: number;
  /** Familiars the two gauges handed over, all of them picked for whichever goal still needed one most. */
  picks: { summon: number; combine: number };
  /** Summons by the time each goal was finished, in the order the goals were given. */
  finished: number[];
};

/** Summons a run may make before it's given up on, and how big its batches grow as it drags on. */
export const RUN_LIMIT = 20_000_000;
const MAX_CHUNK = 256;

const clampStar = (star: number) => Math.max(0, Math.min(MAX_COMBINE_STAR, Math.floor(star) || 0));

/** Puts a goal list in order and inside the stars combining can reach. */
export function tidyGoals(goals: readonly FamiliarGoal[]): FamiliarGoal[] {
  return goals.map((goal) => {
    const from = clampStar(goal.from);
    return { ...goal, from, to: Math.max(from, clampStar(goal.to)) };
  });
}

/**
 * One run to carry every goal to the star it's after, filling the slots the way `mode` and `target` say.
 *
 * Copies of a named familiar are one summon in twelve, so a group's members that aren't goals arrive together as
 * one pool of same type fodder. Goals are served in the order they are given: the one highest up has first call
 * on its group's fodder, and on whatever the two gauges hand over.
 *
 * Both gauges let you choose, so every familiar they give goes to the highest goal that still wants one. That is
 * what priority buys here, and it is most of what a run is really spending.
 */
export function playFamiliars(
  goals: readonly FamiliarGoal[],
  mode: CombineMode,
  target: number,
  random: () => number,
): FamiliarPlay {
  const list = tidyGoals(goals);
  const blank = { summons: 0, combines: 0, picks: { summon: 0, combine: 0 }, finished: list.map(() => 0) };
  if (!list.length || list.every((goal) => goal.to <= goal.from)) return blank;

  const odds = Array.from({ length: MAX_COMBINE_STAR }, (_, star) => combineOdds(star, mode, target));
  const row = () => Array.from({ length: MAX_COMBINE_STAR + 1 }, () => 0);
  // One pool per goal, and one more per group for the members of it that aren't goals.
  const own = list.map(() => row());
  const groups = [...new Set(list.map((goal) => goal.group))];
  const kin = new Map(groups.map((group) => [group, row()]));
  const spare = new Map(groups.map((group) => [group, GROUP_SIZE - list.filter((goal) => goal.group === group).length]));
  list.forEach((goal, index) => {
    own[index]![goal.from]! += 1;
  });

  let summons = 0;
  let combines = 0;
  let gauge = 0;
  const picks = { summon: 0, combine: 0 };
  const finished = list.map(() => 0);
  const done = (index: number) => own[index]![list[index]!.to]! >= 1;
  /** The goal highest up the list that still wants a familiar, or -1 once they are all there. */
  const wanting = () => list.findIndex((_, index) => !done(index));

  /** Hands a gauge's familiar to the goal that needs it most, at the star the gauge gives or its own goal star. */
  const give = (star: number) => {
    const index = wanting();
    if (index < 0) return false;
    own[index]![Math.min(star, list[index]!.to)]! += 1;
    return true;
  };

  const award = (star: number, went: boolean) => {
    gauge += went ? gaugeFor(star).success : gaugeFor(star).fail;
    while (gauge >= COMBINE_BONUS.full) {
      gauge -= COMBINE_BONUS.full;
      if (give(COMBINE_BONUS.star)) picks.combine += 1;
    }
  };

  while (wanting() >= 0 && summons < RUN_LIMIT) {
    // A short run turns on single copies, so it is drawn one at a time; a long one evens out and goes in batches.
    // A batch never steps over the summon gauge's next 300, so its 6★ always lands on the summon that earns it.
    const chunk = Math.max(
      1,
      Math.min(MAX_CHUNK, Math.floor(summons / 64), SUMMON_BONUS.full - (summons % SUMMON_BONUS.full)),
    );
    for (let star = 0; star <= MAX_SUMMON_STAR; star += 1) {
      const chance = (FAMILIAR_SUMMON_CHANCES[star] ?? 0) / 100 / ROSTER_SIZE;
      list.forEach((goal, index) => {
        own[index]![Math.min(star, goal.to)]! += binomial(chunk, chance, random);
      });
      for (const group of groups) {
        const others = spare.get(group)!;
        if (others > 0) kin.get(group)![star]! += binomial(chunk, chance * others, random);
      }
    }
    summons += chunk;
    const gauges = Math.floor(summons / SUMMON_BONUS.full) - picks.summon;
    for (let i = 0; i < gauges; i += 1) if (give(SUMMON_BONUS.star)) picks.summon += 1;

    // Combine from the bottom up, and at every star the goals take their turn in the order they were given.
    const wants = list.map((goal, index) => stillWanted(own[index]!, kin.get(goal.group)!, goal.to, odds));
    for (let star = 0; star < MAX_COMBINE_STAR; star += 1) {
      const { fodder: set, bar } = odds[star]!;
      list.forEach((goal, index) => {
        if (star >= goal.to) return;
        const pool = own[index]!;
        const fodderPool = kin.get(goal.group)!;
        const want = wants[index]!.wantOwn[star + 1]!;
        while (pool[star]! >= 1 + set.self && fodderPool[star]! >= set.same && pool[star + 1]! < want) {
          const went = random() * FULL_BAR < bar;
          pool[star]! -= set.self + (went ? 1 : 0);
          fodderPool[star]! -= set.same;
          if (went) pool[star + 1]! += 1;
          combines += 1;
          award(star, went);
        }
      });
      // Then each group's spares, but only as far as the goals leaning on them still want.
      if (set.same > 0) {
        for (const group of groups) {
          if ((spare.get(group) ?? 0) <= 0) continue;
          const pool = kin.get(group)!;
          const want = list.reduce(
            (sum, goal, index) => (goal.group === group ? sum + (wants[index]!.wantKin[star + 1] ?? 0) : sum),
            0,
          );
          const takes = set.self + set.same;
          while (pool[star]! >= 1 + takes && pool[star + 1]! < want) {
            const went = random() * FULL_BAR < bar;
            pool[star]! -= takes + (went ? 1 : 0);
            if (went) pool[star + 1]! += 1;
            combines += 1;
            award(star, went);
          }
        }
      }
    }
    list.forEach((_, index) => {
      if (!finished[index] && done(index)) finished[index] = summons;
    });
  }
  return { summons, combines, picks, finished };
}

/** Diamonds for that many summons, bought in bundles of eleven. */
export const diamondsFor = (summons: number) =>
  Math.ceil(Math.max(0, summons) / FAMILIAR_BATCH.summons) * FAMILIAR_BATCH.diamonds;

/**
 * Runs an estimate averages over, the fewest it settles for on a long goal, and the summons it spends over all of
 * them. A long run is millions of summons, so it trades runs for the wait.
 */
export const ESTIMATE_RUNS = 400;
/** Runs every estimate makes, however long they are, so the median and the nine-in-ten mean something. */
const FEWEST_RUNS = 8;
/** Runs before the settling test is trusted at all. */
const LEAST_RUNS = 24;
/** Summons an estimate may simulate in all: a long goal spends them on a few runs, a short one on hundreds. */
const RUN_BUDGET = 4_000_000;
/**
 * How close the average has to settle before an estimate stops running: a tenth of a percent of standard error
 * against the average itself. A low fill lands all over the place and takes hundreds of runs to pin down, while a
 * full bar settles in a few dozen, and this spends the runs where they are actually needed.
 */
const SETTLED = 0.03;

export type FamiliarEstimate = {
  /** The goals it priced, in priority order, and how the slots were filled. */
  goals: FamiliarGoal[];
  mode: CombineMode;
  /** The bar it filled to before pressing each combine. */
  target: number;
  /** What each step up comes to at that fill. */
  odds: CombineOdds[];
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
  /** Copies of any one named familiar summoned on the way: one summon in twelve. */
  copies: number;
  /** Summons by the time each goal was done, in the order they were given. */
  finished: number[];
  /** What the last goal is worth in copies of itself at 0★, if it were only ever fed its own copies. */
  ownCopies: number;
  /** True when a run hit the summons it is allowed before every goal was there. */
  beyond: boolean;
  /** The summons half the runs, and nine in ten runs, were done by. */
  median: { summons: number; diamonds: number };
  likely: { summons: number; diamonds: number };
};

/** Estimates already made: a goal list is hundreds of runs, and it only depends on the list, the mode and the fill. */
const ESTIMATES = new Map<string, FamiliarEstimate>();

/** A goal list as one string, so an estimate can be looked up again and a stale one spotted. */
export const goalKey = (goals: readonly FamiliarGoal[]) =>
  goals.map((goal) => `${goal.name}@${goal.group}:${goal.from}>${goal.to}`).join("|");

/**
 * What carrying every goal to the star it's after takes, averaged over up to {@link ESTIMATE_RUNS} runs of
 * {@link playFamiliars}.
 *
 * Which familiars they are only matters for the groups they fall in, since every familiar is summoned as often as
 * the others and every group has four members.
 */
export function estimateFamiliars(
  goals: readonly FamiliarGoal[],
  mode: CombineMode = "self",
  target: number = FULL_BAR,
): FamiliarEstimate {
  const list = tidyGoals(goals);
  const key = `${goalKey(list)}::${mode}::${target}`;
  const known = ESTIMATES.get(key);
  if (known) return known;

  const last = list[list.length - 1];
  const base = {
    goals: list,
    mode,
    target,
    odds: Array.from({ length: MAX_COMBINE_STAR }, (_, star) => combineOdds(star, mode, target)),
    runs: 0,
    summons: 0,
    batches: 0,
    diamonds: 0,
    combines: 0,
    summonPicks: 0,
    combinePicks: 0,
    copies: 0,
    finished: list.map(() => 0),
    ownCopies: STAR_COST[last?.to ?? 0]!,
    beyond: false,
    median: { summons: 0, diamonds: 0 },
    likely: { summons: 0, diamonds: 0 },
  };
  const keep = (estimate: FamiliarEstimate) => {
    ESTIMATES.set(key, estimate);
    return estimate;
  };
  if (!list.length || list.every((goal) => goal.to <= goal.from)) return keep(base);

  const seed = list.reduce((sum, goal, index) => sum + (goal.from * 13 + goal.to * 101) * (index + 3), 0);
  const random = seeded(seed + (mode === "self" ? 101 : 211));
  // Runs go on until the average has settled, or until the summons they have simulated is the limit.
  const results: FamiliarPlay[] = [];
  let total = 0;
  let square = 0;
  let spent = 0;
  while (results.length < ESTIMATE_RUNS) {
    const play = playFamiliars(list, mode, target, random);
    results.push(play);
    total += play.summons;
    square += play.summons * play.summons;
    spent += play.summons;
    // The summons budget comes first, so a goal whose runs are millions long still answers quickly.
    if (spent > RUN_BUDGET) break;
    if (results.length < FEWEST_RUNS) continue;
    if (results.length < LEAST_RUNS) continue;
    const average = total / results.length;
    const spread = Math.sqrt(Math.max(0, square / results.length - average * average));
    if (average > 0 && spread / Math.sqrt(results.length) / average < SETTLED) break;
  }
  const runs = results.length;
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
    finished: list.map((_, index) => mean((play) => play.finished[index] ?? play.summons)),
    beyond: results.some((play) => play.summons >= RUN_LIMIT),
    median: at(0.5),
    likely: at(0.9),
  });
}

/** Every fill priced side by side, and which of them came out cheapest. */
export type FillComparison = {
  /** One priced run per distinct fill, in the order {@link COMBINE_TARGETS} lists them. */
  fills: FamiliarEstimate[];
  /** The cheapest fill, and what it saves against filling the bar the whole way. */
  best: FamiliarEstimate;
  full: FamiliarEstimate;
  saved: number;
  /** The stars where the fill changes anything: only the ones whose combines move the gauge. */
  matters: number[];
};

/**
 * Prices every fill for the same goals, so the question of how far to fill the bar can be answered rather than
 * argued about.
 *
 * The materials a star costs are the same at any fill — half the chance is twice the attempts on half the
 * materials — so what separates them is the combine gauge, which pays out on a failure as well as a success. That
 * makes a lower fill worth more gauge per material at the stars whose combines count for it, and worth exactly
 * nothing anywhere else.
 */
export function compareFills(goals: readonly FamiliarGoal[], mode: CombineMode = "self"): FillComparison {
  const list = tidyGoals(goals);
  const top = list.reduce((highest, goal) => Math.max(highest, goal.to), 0);
  // Two targets that settle on the same materials at every star are the same run, so only one of them is priced.
  const seen = new Set<string>();
  const fills = COMBINE_TARGETS.flatMap((target) => {
    const shape = planFor(top, mode, target)
      .map((set) => `${set.self}/${set.same}`)
      .join(",");
    if (seen.has(shape)) return [];
    seen.add(shape);
    return [estimateFamiliars(list, mode, target)];
  });
  const full = fills.find((fill) => fill.target === FULL_BAR) ?? fills[0]!;
  const best = fills.reduce((cheapest, fill) => (fill.summons < cheapest.summons ? fill : cheapest), fills[0]!);
  // A star only cares about the fill when its combines move the gauge and the bar can actually be set lower.
  const matters = Array.from({ length: top }, (_, star) => star).filter((star) => {
    const { success, fail } = gaugeFor(star);
    if (!success && !fail) return false;
    return new Set(COMBINE_TARGETS.map((target) => combineOdds(star, mode, target).bar)).size > 1;
  });
  return { fills, best, full, saved: Math.max(0, full.diamonds - best.diamonds), matters };
}
