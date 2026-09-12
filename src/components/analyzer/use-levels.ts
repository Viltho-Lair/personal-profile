"use client";

import { useCallback, useSyncExternalStore } from "react";

type Levels = Record<number, number>;

const EMPTY: Levels = {};

type Store = {
  subscribe: (listener: () => void) => () => void;
  read: () => Levels;
  write: (next: Levels) => void;
};

const stores = new Map<string, Store>();

/**
 * Levels live in localStorage, read through an external store so hydration
 * starts from the server's empty snapshot and switches to the stored values
 * once the client takes over. Storage can fail (private windows, blocked site
 * data), in which case the levels simply last for the session.
 */
function storeFor(key: string): Store {
  const existing = stores.get(key);
  if (existing) return existing;

  let cached: Levels | null = null;
  const listeners = new Set<() => void>();

  const store: Store = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read() {
      if (cached === null) {
        try {
          cached = JSON.parse(localStorage.getItem(key) ?? "{}") as Levels;
        } catch {
          cached = EMPTY;
        }
      }
      return cached;
    },
    write(next) {
      cached = next;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Keep the in-memory levels; persistence is best effort.
      }
      for (const listener of listeners) listener();
    },
  };

  stores.set(key, store);
  return store;
}

export function useLevels(storageKey: string, defaultLevel: number) {
  const store = storeFor(storageKey);
  const levels = useSyncExternalStore(
    store.subscribe,
    store.read,
    () => EMPTY,
  );

  const levelFor = useCallback(
    (id: number) => levels[id] ?? defaultLevel,
    [levels, defaultLevel],
  );

  const setLevel = useCallback(
    (id: number, level: number) => store.write({ ...store.read(), [id]: level }),
    [store],
  );

  const setAll = useCallback(
    (ids: number[], level: number) =>
      store.write(Object.fromEntries(ids.map((id) => [id, level]))),
    [store],
  );

  return { levelFor, setLevel, setAll };
}
