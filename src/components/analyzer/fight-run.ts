"use client";

import { useSyncExternalStore } from "react";
import { createFight, fightStatsOf, sameFightStats, type Fight, type FightState, type FightStats } from "@/lib/game/battle";
import { publishLiveFight } from "./live-fight";
import type { promotionFight } from "./promotion-fight";

/** Frames are ~30 a second; a throttled background tab still catches up to real time, a second at most per frame. */
const FRAME_MS = 33;
const MAX_FRAME_SECONDS = 1;

export type FightSetup = ReturnType<typeof promotionFight>;
export type FightRun = { setup: FightSetup; phase: "running" | "done"; snap: FightState };

/**
 * The fight being rendered, kept outside any component so the Analysis and Render views read the same data, and
 * switching views, tabs or settings leaves it be. It only resets with a new render, or when the page reloads.
 */
let run: FightRun | null = null;
let fight: Fight | null = null;
let timer: number | null = null;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Stops the fight playing; with `clear`, forgets it too. */
export function stopFightRun(clear = false) {
  if (timer !== null) window.clearTimeout(timer);
  timer = null;
  fight = null;
  publishLiveFight(null);
  if (clear) {
    run = null;
    emit();
  }
}

/** Starts a new fight from this setup, replacing whatever was rendered before. */
export function startFightRun(setup: FightSetup) {
  stopFightRun();
  const current = createFight(setup.input);
  fight = current;
  run = { setup, phase: "running", snap: current.state() };
  emit();
  let last = performance.now();
  const frame = () => {
    if (fight !== current) return;
    const now = performance.now();
    current.advance(Math.min(MAX_FRAME_SECONDS, (now - last) / 1000));
    last = now;
    const state = current.state();
    // Gear equipped mid-fight updates the setup's stats, so keep the latest one.
    const latest = run?.setup ?? setup;
    if (state.done) {
      timer = null;
      fight = null;
      publishLiveFight(null);
      run = { setup: latest, phase: "done", snap: state };
    } else {
      // The Stats Summary shows Attack with the buffs that are on as the fight plays.
      publishLiveFight({ atkBonus: state.atkBonus, speedBonus: state.speedBonus });
      run = { setup: latest, phase: "running", snap: state };
      timer = window.setTimeout(frame, FRAME_MS);
    }
    emit();
  };
  timer = window.setTimeout(frame, FRAME_MS);
}

/** Casts a skill with auto off in the fight playing. */
export function castInFightRun(name: string) {
  fight?.cast(name);
}

/** Swaps new stats into the fight playing, as gear or a class is equipped or unequipped while it runs. */
export function retuneFightRun(stats: FightStats) {
  if (!fight || !run || sameFightStats(fightStatsOf(run.setup.input), stats)) return;
  fight.retune(stats);
  run = { ...run, setup: { ...run.setup, input: { ...run.setup.input, ...stats } } as FightSetup, snap: fight.state() };
  emit();
}

/** The rendered fight, the same for every view, or null before the first render. */
export function useFightRun(): FightRun | null {
  return useSyncExternalStore(subscribe, () => run, () => null);
}
