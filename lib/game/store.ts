"use client";

// Single source of truth for gameplay state, consumed by both the DOM UI
// and the 3D scene. The store holds no matching or movement rules of its
// own — keys go through the pure module in ./matching, time steps through
// ./movement. Per-frame positions live OUTSIDE React state in the
// gameMotion box below: no DOM view consumes them, so the 60 fps clock
// never re-renders the HUD. The store only receives movement's discrete
// events (spawns, Danger Line breach, near-line band changes).

import { create } from "zustand";

import { applyKey, activeEnemies, type EnemyState } from "./matching";
import {
  createMotion,
  levelComplete,
  nearDanger,
  stepMotion,
  stunMotion,
  type MotionWorld,
} from "./movement";

export type BattlefieldEnemy = EnemyState & { pulse: number };

/** Level 1's Word queue in spawn order (Level data arrives with #2 step 2). */
export const LEVEL_ONE_WORDS: readonly string[] = ["F", "FJ", "J", "JF"];

export type GamePhase = "playing" | "level-complete" | "game-over";

const motion = (): MotionWorld => createMotion(LEVEL_ONE_WORDS);
const spawnedEnemies = (world: MotionWorld): BattlefieldEnemy[] =>
  world.walking.map((enemy) => ({
    id: enemy.id,
    word: LEVEL_ONE_WORDS[enemy.id - 1],
    defeated: false,
    pulse: 0,
  }));

export const gameMotion: { world: MotionWorld } = { world: motion() };

type GameStore = {
  phase: GamePhase;
  enemies: BattlefieldEnemy[];
  sequence: string;
  hits: number;
  misses: number;
  combo: number;
  paused: boolean;
  sound: boolean;
  /** True while an active Enemy is closing on the Danger Line. */
  dangerNear: boolean;
  feedback: string;
  lastKey: string;
  shakeTick: number;
  /** Bumps on every correct key so the Player's attack swing can retrigger. */
  attackTick: number;
  typeKey: (rawKey: string) => void;
  /** Advance the motion world one frame; called by the scene's clock. */
  tick: (dt: number) => void;
  reset: () => void;
  setPaused: (paused: boolean) => void;
  toggleSound: () => void;
};

const READY_FEEDBACK = "Type F or J to attack";

export const useGameStore = create<GameStore>((set, get) => ({
  phase: "playing",
  enemies: spawnedEnemies(gameMotion.world),
  sequence: "",
  hits: 0,
  misses: 0,
  combo: 0,
  paused: false,
  sound: true,
  dangerNear: false,
  feedback: READY_FEEDBACK,
  lastKey: "",
  shakeTick: 0,
  attackTick: 0,

  typeKey: (rawKey) => {
    const state = get();
    const remaining = activeEnemies(state.enemies).length;
    if (state.paused || state.phase !== "playing" || remaining === 0) return;

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
    // A correct key briefly stops every Enemy it hit (plan_a §4/§7).
    if (event.kind !== "miss") {
      gameMotion.world = stunMotion(gameMotion.world, event.hitIds);
    }
    const stillLeft = remaining - event.defeatedIds.length;
    const phase: GamePhase =
      stillLeft === 0 && levelComplete(gameMotion.world, state.enemies.length - stillLeft)
        ? "level-complete"
        : state.phase;

    set({
      phase,
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
            ? phase === "level-complete"
              ? "Wave cleared!"
              : `${event.defeatedIds.length} creature cleared — new target`
            : `${event.hitIds.length} target${event.hitIds.length > 1 ? "s" : ""} matched`,
    });
  },

  tick: (dt) => {
    const state = get();
    if (state.paused || state.phase !== "playing") return;

    const aliveIds = new Set(activeEnemies(state.enemies).map((enemy) => enemy.id));
    const step = stepMotion(gameMotion.world, dt, aliveIds);
    gameMotion.world = step.world;

    if (step.breached) {
      set({ phase: "game-over", feedback: "A creature reached the Danger Line" });
      return;
    }
    if (step.spawnedIds.length > 0) {
      set({
        enemies: [
          ...state.enemies,
          ...step.spawnedIds.map((id) => ({
            id,
            word: LEVEL_ONE_WORDS[id - 1],
            defeated: false,
            pulse: 0,
          })),
        ],
      });
    }
    const dangerNear = nearDanger(step.world, aliveIds);
    if (dangerNear !== state.dangerNear) set({ dangerNear });
  },

  reset: () => {
    gameMotion.world = motion();
    set({
      phase: "playing",
      enemies: spawnedEnemies(gameMotion.world),
      sequence: "",
      hits: 0,
      misses: 0,
      combo: 0,
      paused: false,
      dangerNear: false,
      feedback: READY_FEEDBACK,
      lastKey: "",
    });
  },

  setPaused: (paused) => set({ paused }),
  toggleSound: () => set((state) => ({ sound: !state.sound })),
}));
