import { createFight, simulateFight, type FightInput, type FightResult } from "./battle";

/** Rave pressed by hand: the fight-clock seconds of its first and second press, each released as soon as it's charged. */
export type RaveTiming = { first: number; second: number };

export const RAVE = "Rave";
/** How often a scripted fight checks whether it's time to press. */
const TICK = 0.1;
/** The press times tried: every 5 seconds, the second at least 10 seconds after the first. */
const GRID = 5;
const GAP = 10;

/**
 * The fight with every skill on auto except Rave, pressed at `timing` (or on auto with none). Skills the player set
 * to manual in a render are pressed as soon as they're ready here, as auto would.
 */
export function playFight(input: FightInput, timing: RaveTiming | null): FightResult {
  const hasRave = input.skills.some((skill) => skill.name === RAVE);
  if (!timing || !hasRave) return simulateFight({ ...input, manual: [] });
  const fight = createFight({ ...input, manual: [RAVE] });
  const presses = [timing.first, timing.second];
  // 0: waiting for the first press, 1: storing, 2: waiting for the second, 3: storing again, 4: done.
  let stage = 0;
  while (!fight.state().done) {
    fight.advance(TICK);
    const { clock, done } = fight.state();
    if (done || stage >= 4) continue;
    const pressing = stage % 2 === 0;
    // A release goes as soon as Rave is charged; a press once its time has come and Rave is ready.
    if ((!pressing || clock >= presses[stage / 2]!) && fight.cast(RAVE)) stage += 1;
  }
  const { points, casts, releases, total, basic, bySkill } = fight.state();
  return { points, casts, releases, total, basic, bySkill };
}

/** The press times worth trying for a fight of this length, auto (null) first. */
export function raveTimings(duration: number): (RaveTiming | null)[] {
  const timings: (RaveTiming | null)[] = [null];
  for (let first = 0; first <= duration - GAP; first += GRID) {
    for (let second = first + GAP; second <= duration - GRID; second += GRID) timings.push({ first, second });
  }
  return timings;
}

/** The Rave timing that deals the most in this fight, or null when auto does as well (or there's no Rave). */
export function bestRaveTiming(input: FightInput, onFight?: () => void): RaveTiming | null {
  if (!input.skills.some((skill) => skill.name === RAVE)) return null;
  let best: { timing: RaveTiming | null; total: number } | null = null;
  for (const timing of raveTimings(input.duration)) {
    const { total } = playFight(input, timing);
    onFight?.();
    // A timing has to beat auto by more than rounding to be worth pressing by hand.
    if (!best || total > best.total * (1 + 1e-9)) best = { timing, total };
  }
  return best?.timing ?? null;
}
