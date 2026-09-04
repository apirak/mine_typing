"use client";

// Single source of truth for gameplay state, consumed by both the DOM UI
// and the 3D scene. The store holds no matching rules of its own — every
// key goes through the pure module in ./matching.

import { create } from "zustand";

import { applyKey, activeEnemies, enemies as seedEnemies, type EnemyState } from "./matching";

export type BattlefieldEnemy = EnemyState & { lane: number; pulse: number };

export const STARTING_ENEMIES: readonly { id: number; word: string; lane: number }[] = [
  { id: 1, word: "F", lane: 34 },
  { id: 2, word: "FJ", lane: 50 },
  { id: 3, word: "J", lane: 67 },
  { id: 4, word: "JF", lane: 82 },
];

const initialEnemies = (): BattlefieldEnemy[] =>
  seedEnemies(STARTING_ENEMIES).map((enemy) => ({ ...enemy, pulse: 0 }));

type GameStore = {
  enemies: BattlefieldEnemy[];
  sequence: string;
  hits: number;
  misses: number;
  combo: number;
  paused: boolean;
  sound: boolean;
  feedback: string;
  lastKey: string;
  shakeTick: number;
  /** Bumps on every correct key so the Player's attack swing can retrigger. */
  attackTick: number;
  typeKey: (rawKey: string) => void;
  reset: () => void;
  setPaused: (paused: boolean) => void;
  toggleSound: () => void;
};

const READY_FEEDBACK = "Type F or J to attack";

export const useGameStore = create<GameStore>((set, get) => ({
  enemies: initialEnemies(),
  sequence: "",
  hits: 0,
  misses: 0,
  combo: 0,
  paused: false,
  sound: true,
  feedback: READY_FEEDBACK,
  lastKey: "",
  shakeTick: 0,
  attackTick: 0,

  typeKey: (rawKey) => {
    const state = get();
    const remaining = activeEnemies(state.enemies).length;
    if (state.paused || remaining === 0) return;

    const result = applyKey(
      state.enemies,
      {
        sequence: state.sequence,
        hits: state.hits,
        misses: state.misses,
        combo: state.combo,
      },
      rawKey,
    );
    if (!result) return;

    const { event } = result;
    const hitSet = new Set([...event.hitIds, ...event.defeatedIds]);
    set({
      enemies: result.enemies.map((enemy) =>
        hitSet.has(enemy.id) ? { ...enemy, pulse: enemy.pulse + 1 } : enemy,
      ),
      sequence: result.progress.sequence,
      hits: result.progress.hits,
      misses: result.progress.misses,
      combo: result.progress.combo,
      lastKey: rawKey.toUpperCase(),
      attackTick: state.attackTick + (event.kind === "miss" ? 0 : 1),
      shakeTick: state.shakeTick + (event.kind === "miss" ? 1 : 0),
      feedback:
        event.kind === "miss"
          ? `${rawKey.toUpperCase()} missed — start again`
          : event.kind === "defeat"
            ? remaining - event.defeatedIds.length === 0
              ? "Wave cleared!"
              : `${event.defeatedIds.length} creature cleared — new target`
            : `${event.hitIds.length} target${event.hitIds.length > 1 ? "s" : ""} matched`,
    });
  },

  reset: () =>
    set({
      enemies: initialEnemies(),
      sequence: "",
      hits: 0,
      misses: 0,
      combo: 0,
      paused: false,
      feedback: READY_FEEDBACK,
      lastKey: "",
    }),

  setPaused: (paused) => set({ paused }),
  toggleSound: () => set((state) => ({ sound: !state.sound })),
}));
