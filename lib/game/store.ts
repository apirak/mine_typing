"use client";

// Single source of truth for gameplay state, consumed by both the DOM UI
// and the 3D scene. The store holds no matching or movement rules of its
// own — keys go through the pure module in ./matching, time steps through
// ./movement, and everything that distinguishes Levels comes from the
// plain data in ./levels. Persistence (ticket #5) flows through the
// GameStorage interface in ./storage only: the store never touches
// window.localStorage directly. Per-frame positions live OUTSIDE React
// state in the gameMotion box below: no DOM view consumes them, so the
// 60 fps clock never re-renders the HUD. The store only receives
// movement's discrete events (spawns, Danger Line breach, near-line band
// changes).

import { create } from "zustand";

import { applyKey, activeEnemies, type EnemyState } from "./matching";
import {
  ALL_LEVELS,
  getLevel,
  pairSpawnChance,
  type EnemyKind,
  type EnemyVariant,
  type Level,
} from "./levels";
import {
  createMotion,
  levelComplete,
  nearDanger,
  nearestVariant,
  stepMotion,
  stunMotion,
  type MotionWorld,
} from "./movement";
import { gameStorage } from "./storage-client";
import {
  accuracyPercent,
  bestOfResults,
  newLevelResult,
  newProfile,
  withSettings,
  type GameSettings,
  type LevelBest,
} from "./storage";

export type BattlefieldEnemy = EnemyState & {
  pulse: number;
  /** Speed variant from the Level data; drives the walk speed and the tint. */
  variant: EnemyVariant;
  /** The World's Enemy kind; drives the scene's small rig touches. */
  kind: EnemyKind;
};

export type GamePhase = "playing" | "level-complete" | "game-over";

/** Per-run spawn schedules get a fresh seed so runs don't share a rhythm. */
const freshSeed = () => Math.floor(Math.random() * 0x7fffffff);

/** A Level's motion world: its own speed, spawn interval, pair chance, and a seed. */
const motionFor = (level: Level, seed: number): MotionWorld =>
  createMotion(level.entries, {
    walkSpeed: level.walkSpeed,
    spawnInterval: level.spawnInterval,
    pairChance: pairSpawnChance(level),
    seed,
  });

const spawnedEnemies = (level: Level, world: MotionWorld): BattlefieldEnemy[] =>
  world.walking.map((enemy) => freshEnemy(level, enemy.id));

const freshEnemy = (level: Level, id: number): BattlefieldEnemy => {
  const entry = level.entries[id - 1];
  return {
    id,
    word: entry.word,
    variant: entry.variant ?? "walker",
    kind: level.enemyKind,
    defeated: false,
    pulse: 0,
  };
};

/** The status line a fresh run of a Level starts with. */
export const readyFeedback = (level: Level): string =>
  level.trainedKeys.length > 0
    ? `Type ${level.trainedKeys.join(" or ")} to attack`
    : "Type the words above to attack";

/** Store fields a fresh run of a Level starts with. */
const freshRunState = (level: Level) => ({
  phase: "playing" as GamePhase,
  enemies: spawnedEnemies(level, gameMotion.world),
  sequence: "",
  hits: 0,
  misses: 0,
  combo: 0,
  bestCombo: 0,
  paused: false,
  dangerNear: false,
  dangerVariant: null as EnemyVariant | null,
  elapsedSeconds: 0,
  feedback: readyFeedback(level),
  lastKey: "",
  shakeTick: 0,
  attackTick: 0,
});

const firstLevel = ALL_LEVELS[0];

/** How long the virtual keyboard's pressed key stays down before releasing. */
const KEY_FLASH_MS = 180;

export const gameMotion: { world: MotionWorld } = { world: motionFor(firstLevel, 0) };

type GameStore = {
  /** The Level currently loaded; its data seeds the run. */
  level: Level;
  phase: GamePhase;
  enemies: BattlefieldEnemy[];
  sequence: string;
  hits: number;
  misses: number;
  combo: number;
  /** The longest streak of this run (combo resets on a miss). */
  bestCombo: number;
  paused: boolean;
  sound: boolean;
  /** Background music toggle (plan_a §13); the loop itself comes later. */
  music: boolean;
  /** Master volume, 0–100 (plan_a §13). */
  volume: number;
  /** Stored reduced-motion choice; null defers to the OS preference. */
  reducedMotion: boolean | null;
  showVirtualKeyboard: boolean;
  /** The Level's best stored accuracy and combo, or null before storage has one. */
  levelBest: LevelBest | null;
  /** True while an active Enemy is closing on the Danger Line. */
  dangerNear: boolean;
  /** Variant of the Enemy closest to the line while dangerNear (for the mirror). */
  dangerVariant: EnemyVariant | null;
  /** Play time of the current run in seconds; frozen while paused. */
  elapsedSeconds: number;
  feedback: string;
  lastKey: string;
  shakeTick: number;
  /** Bumps on every correct key so the Player's attack swing can retrigger. */
  attackTick: number;
  typeKey: (rawKey: string) => void;
  /** Advance the motion world one frame; called by the scene's clock. */
  tick: (dt: number) => void;
  /** Start a fresh run of the Level with the given route id. */
  loadLevel: (id: string) => void;
  /** Restart the loaded Level from its first spawn. */
  reset: () => void;
  setPaused: (paused: boolean) => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  setVolume: (volume: number) => void;
  setReducedMotion: (reducedMotion: boolean | null) => void;
  setShowVirtualKeyboard: (showVirtualKeyboard: boolean) => void;
  /** Forget every saved run (settings stay); the Settings screen's Reset. */
  resetProgress: () => void;
  /** Restore persisted settings and the loaded Level's bests (client-side). */
  hydrate: () => Promise<void>;
};

export const useGameStore = create<GameStore>((set, get) => {
  // Pending release of the pressed-key flash, cleared when the next key
  // application restarts the flash.
  let releaseTimer: ReturnType<typeof setTimeout> | undefined;

  // The settings slice as the storage interface sees it.
  const settingsOf = (state: GameStore): GameSettings => ({
    sound: state.sound,
    music: state.music,
    volume: state.volume,
    reducedMotion: state.reducedMotion,
    showVirtualKeyboard: state.showVirtualKeyboard,
  });

  // Storage writes are best-effort in Phase 1: a failed write never breaks
  // a run. Settings writes go through one chain so quick toggles cannot
  // interleave their read-modify-write and drop a setting.
  let settingsWrite: Promise<void> = Promise.resolve();
  const bestEffort = (write: () => Promise<void>) => {
    settingsWrite = settingsWrite
      .then(write)
      .catch(() => {});
  };

  /** Bests for the Level, from storage; applied only if the Level is still
   * loaded. Never rejects — best-effort reads leave the current bests alone. */
  const refreshBests = async (levelId: string) => {
    try {
      const results = await gameStorage().loadLevelResults();
      const best = bestOfResults(results, levelId);
      if (get().level.id !== levelId) return;
      set({ levelBest: best });
    } catch {
      // Storage read failed; the run continues with the bests it has.
    }
  };

  /** Write the current settings through the interface (fire-and-forget). */
  const persistSettings = () => {
    bestEffort(async () => {
      const storage = gameStorage();
      const settings = settingsOf(get());
      const profile = await storage.loadProfile();
      await storage.saveProfile(
        profile ? withSettings(profile, settings) : newProfile(settings),
      );
    });
  };

  /** Save a completed run, then surface its effect on the Level's bests. */
  const persistLevelResult = (
    levelId: string,
    progress: { hits: number; misses: number; combo: number; elapsedSeconds: number },
  ) => {
    const record = newLevelResult({
      levelId,
      accuracy: accuracyPercent(progress.hits, progress.misses),
      correctKeys: progress.hits,
      incorrectKeys: progress.misses,
      bestCombo: progress.combo,
      elapsedSeconds: progress.elapsedSeconds,
    });
    gameStorage()
      .saveLevelResult(record)
      .then(() => refreshBests(levelId))
      .catch(() => {
        // Best-effort: a failed write never breaks a run.
      });
  };

  return {
    level: firstLevel,
    ...freshRunState(firstLevel),
    sound: true,
    music: true,
    volume: 80,
    reducedMotion: null,
    showVirtualKeyboard: true,
    levelBest: null,

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
      const bestCombo = Math.max(state.bestCombo, result.progress.combo);

      set({
        phase,
        enemies: result.enemies.map((enemy) =>
          hitSet.has(enemy.id) ? { ...enemy, pulse: enemy.pulse + 1 } : enemy,
        ),
        sequence: result.progress.sequence,
        hits: result.progress.hits,
        misses: result.progress.misses,
        combo: result.progress.combo,
        bestCombo,
        lastKey: rawKey.toUpperCase(),
        attackTick: state.attackTick + (event.kind === "miss" ? 0 : 1),
        shakeTick: state.shakeTick + (event.kind === "miss" ? 1 : 0),
        feedback:
          event.kind === "miss"
            ? `${rawKey.toUpperCase()} missed — start again`
            : event.kind === "defeat"
              ? phase === "level-complete"
                ? "Level cleared!"
                : `${event.defeatedIds.length} creature cleared — new target`
              : `${event.hitIds.length} target${event.hitIds.length > 1 ? "s" : ""} matched`,
      });

      // The virtual key's pressed look is a flash, not a latch: release
      // it shortly after every application or it stays stuck down until
      // the next keypress. A pending release after a run reset is a
      // harmless no-op (freshRunState already cleared lastKey).
      clearTimeout(releaseTimer);
      releaseTimer = setTimeout(() => set({ lastKey: "" }), KEY_FLASH_MS);

      // The level-complete phase is the save point (ticket #5).
      if (phase === "level-complete" && state.phase === "playing") {
        persistLevelResult(state.level.id, {
          hits: result.progress.hits,
          misses: result.progress.misses,
          combo: bestCombo,
          elapsedSeconds: state.elapsedSeconds,
        });
      }
    },

    tick: (dt) => {
      const state = get();
      if (state.paused || state.phase !== "playing") return;

      // Play time advances only on live frames, so pauses and end phases
      // stay out of the run's time (Result's CPM and the 3★ time target).
      const elapsedSeconds = state.elapsedSeconds + dt;
      const aliveIds = new Set(activeEnemies(state.enemies).map((enemy) => enemy.id));
      const step = stepMotion(gameMotion.world, dt, aliveIds);
      gameMotion.world = step.world;

      if (step.breached) {
        set({ phase: "game-over", elapsedSeconds, feedback: "A creature reached the Danger Line" });
        return;
      }

      const patch: Partial<GameStore> = { elapsedSeconds };
      if (step.spawnedIds.length > 0) {
        patch.enemies = [
          ...state.enemies,
          ...step.spawnedIds.map((id) => freshEnemy(state.level, id)),
        ];
      }
      const dangerNear = nearDanger(step.world, aliveIds);
      if (dangerNear !== state.dangerNear) patch.dangerNear = dangerNear;
      const dangerVariant = nearestVariant(step.world, aliveIds);
      if (dangerVariant !== state.dangerVariant) patch.dangerVariant = dangerVariant;
      set(patch);
    },

    loadLevel: (id) => {
      const level = getLevel(id);
      if (!level) return;
      gameMotion.world = motionFor(level, freshSeed());
      set({ level, ...freshRunState(level) });
      void refreshBests(level.id);
    },

    reset: () => {
      const level = get().level;
      gameMotion.world = motionFor(level, freshSeed());
      set(freshRunState(level));
    },

  setPaused: (paused) => set({ paused }),
  toggleSound: () => {
    set((state) => ({ sound: !state.sound }));
    persistSettings();
  },
  toggleMusic: () => {
    set((state) => ({ music: !state.music }));
    persistSettings();
  },
  setVolume: (volume) => {
    set({ volume: Math.min(100, Math.max(0, Math.round(volume))) });
    persistSettings();
  },
  setReducedMotion: (reducedMotion) => {
    set({ reducedMotion });
    persistSettings();
  },
  setShowVirtualKeyboard: (showVirtualKeyboard) => {
    set({ showVirtualKeyboard });
    persistSettings();
  },
  /** Reset progress (ticket #6): forget every saved run; settings stay. */
  resetProgress: () => {
    set({ levelBest: null });
    gameStorage()
      .clearLevelResults()
      .catch(() => {
        // Best-effort: a failed clear never breaks the session.
      });
  },

  hydrate: async () => {
    // Best-effort restore: a storage failure keeps the defaults.
    try {
      const profile = await gameStorage().loadProfile();
      if (profile) {
        const { settings } = profile;
        set({
          sound: settings.sound,
          music: settings.music ?? true,
          volume: settings.volume ?? 80,
          reducedMotion: settings.reducedMotion,
          showVirtualKeyboard: settings.showVirtualKeyboard,
        });
      }
    } catch {
      // Storage read failed; defaults stay.
    }
    await refreshBests(get().level.id);
  },
  };
});
