"use client";

// The Phase 1 browser binding of the GameStorage interface: localStorage
// behind the same seam the tests exercise with a fake. Created lazily so
// server render never touches `window`.

import { createLocalGameStorage } from "./local-game-storage";
import type { GameStorage } from "./storage";

let instance: GameStorage | null = null;

export function gameStorage(): GameStorage {
  if (instance === null) {
    instance = createLocalGameStorage(window.localStorage);
  }
  return instance;
}
