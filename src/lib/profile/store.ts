import { readProfile, readProfileRaw, saveProfile, type StorageLike } from "./storage";
import { emptyProfile, type ProfileV1 } from "./types";

/**
 * An external store for useSyncExternalStore. The profile is read from
 * storage on first use and saved after every change.
 *
 * Storage is shared across every tab on the same origin, so the profile
 * cached here can go stale: another tab may save a newer profile between
 * this tab's load and its next change. `lastRaw` is the raw string this
 * store last loaded or saved; whenever the live value under `PROFILE_KEY`
 * differs from it, the cache is stale and is reloaded before use.
 */
export function createProfileStore(getStorage: () => StorageLike | null) {
  const listeners = new Set<() => void>();
  let current: ProfileV1 | null = null;
  let lastRaw: string | null = null;
  let readOnly = false;
  let warnedReadOnly = false;

  function load(storage: StorageLike): ProfileV1 {
    const result = readProfile(storage);
    readOnly = result.readOnly;
    // Read after readProfile() runs: it may itself have written PROFILE_KEY
    // (migrating legacy levels), and lastRaw must reflect the final value.
    lastRaw = readProfileRaw(storage);

    if (readOnly && !warnedReadOnly && process.env.NODE_ENV !== "production") {
      warnedReadOnly = true;
      console.warn(
        "The saved profile is from a newer version of the analyzer; changes made now will not be saved.",
      );
    }

    return result.profile;
  }

  /** The raw value differs from what was last loaded/saved, and isn't null. */
  function staleIn(storage: StorageLike): boolean {
    const raw = readProfileRaw(storage);
    // A null raw value means storage has nothing (or is blocked) - never a
    // reason to discard a cached, possibly session-only, profile.
    return raw !== null && raw !== lastRaw;
  }

  function getSnapshot(): ProfileV1 {
    if (current === null) {
      const storage = getStorage();
      current = storage ? load(storage) : emptyProfile();
    }
    return current;
  }

  function update(change: (profile: ProfileV1) => ProfileV1) {
    const storage = getStorage();
    const base = storage && staleIn(storage) ? load(storage) : getSnapshot();

    current = change(base);

    if (storage && !readOnly) {
      if (saveProfile(storage, current)) lastRaw = readProfileRaw(storage);
    }

    for (const listener of listeners) listener();
  }

  /** Reloads from storage and notifies listeners if it changed elsewhere. */
  function refresh() {
    const storage = getStorage();
    if (!storage || !staleIn(storage)) return;
    current = load(storage);
    for (const listener of listeners) listener();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return { subscribe, getSnapshot, update, refresh };
}
