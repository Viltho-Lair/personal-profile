import { loadProfile, saveProfile, type StorageLike } from "./storage";
import { emptyProfile, type ProfileV1 } from "./types";

/**
 * An external store for useSyncExternalStore. The profile is read from
 * storage on first use and saved after every change.
 */
export function createProfileStore(getStorage: () => StorageLike | null) {
  const listeners = new Set<() => void>();
  let current: ProfileV1 | null = null;

  function getSnapshot(): ProfileV1 {
    if (current === null) {
      const storage = getStorage();
      current = storage ? loadProfile(storage) : emptyProfile();
    }
    return current;
  }

  function update(change: (profile: ProfileV1) => ProfileV1) {
    current = change(getSnapshot());
    const storage = getStorage();
    if (storage) saveProfile(storage, current);
    for (const listener of listeners) listener();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return { subscribe, getSnapshot, update };
}
