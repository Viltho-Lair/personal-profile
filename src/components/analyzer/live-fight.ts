"use client";

import { useSyncExternalStore } from "react";

/** What a rendering fight shares with the rest of the analyzer: the buffs on right now. */
export type LiveFight = { atkBonus: number; speedBonus: number };

let current: LiveFight | null = null;
const listeners = new Set<() => void>();

/** Called by the fight render each frame, and with null once it stops or ends. */
export function publishLiveFight(value: LiveFight | null) {
  if (value === current || (value && current && value.atkBonus === current.atkBonus && value.speedBonus === current.speedBonus)) return;
  current = value;
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The buffs of the fight being rendered, or null when none is. */
export function useLiveFight(): LiveFight | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}
