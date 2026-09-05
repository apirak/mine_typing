"use client";

// The Phase 1 browser binding of the GameStorage interface: localStorage
// behind the same seam the tests exercise with a fake. Created lazily so
// server render never touches `window`.

import { createLocalGameStorage, type StorageLike } from "./local-game-storage";
import type { GameStorage } from "./storage";

let instance: GameStorage | null = null;

// Browsers can block localStorage outright (SecurityError on property
// access). Storage is best-effort (ADR 0004): the game stays playable on
// a no-op backing with default settings instead of crashing.
const availableBacking = (): StorageLike => {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => {} };
  }
};

export function gameStorage(): GameStorage {
  if (instance === null) {
    instance = createLocalGameStorage(availableBacking());
  }
  return instance;
}
