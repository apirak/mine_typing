// The storage contract (plan_a §12, spec #2 step 4): progress and settings
// flow through this interface so Phase 2's Firestore can replace Phase 1's
// localStorage without touching gameplay. Pure types and record factories
// live here — no DOM, no React — so the shape sits at the pure seam.

// v2 (spec #15): Level ids became "<world>-<level>" across five Worlds.
// Records from v1 (World 1's ids "1"–"5") migrate on load.
export const SCHEMA_VERSION = 2;
/** The schema versions this build reads; anything newer stays absent. */
export const READABLE_SCHEMA_VERSIONS: readonly number[] = [SCHEMA_VERSION, SCHEMA_VERSION - 1];

/**
 * Old World-1-only result ids ("1"–"5") mapped onto the new curriculum
 * ids ("1-1"–"1-5"); other ids pass through untouched.
 */
export function migratedLevelId(levelId: string): string {
  const world = Number(levelId);
  return world >= 1 && world <= 5 ? `1-${world}` : levelId;
}

/** Fields every persisted record carries (spec #2 Implementation Decisions). */
export type StorageRecord = {
  id: string;
  /** Absent in Phase 1; Firestore attaches the account in Phase 2. */
  userId?: string;
  /** ISO timestamp of record creation. */
  createdAt: string;
  /** ISO timestamp of the last write. */
  updatedAt: string;
  schemaVersion: number;
};

/** The player's tunable settings (spec #2; the editing screen is #6). */
export type GameSettings = {
  sound: boolean;
  /** Background music on/off; the loop itself lands with the audio work. */
  music: boolean;
  /** Master volume, 0–100. */
  volume: number;
  /** An explicit reduced-motion choice; null defers to the OS preference. */
  reducedMotion: boolean | null;
  showVirtualKeyboard: boolean;
};

/** The singleton record holding the player's settings. */
export type PlayerProfile = StorageRecord & {
  settings: GameSettings;
};

/** One completed run of a Level, as the store reports it. */
export type LevelResultData = {
  /** The stable Level id from the Level data, not a route or index. */
  levelId: string;
  /** Rounded 0–100 percentage for this run. */
  accuracy: number;
  correctKeys: number;
  incorrectKeys: number;
  /** Longest streak reached during the run. */
  bestCombo: number;
  /** Play time of the run in seconds (pauses excluded). */
  elapsedSeconds: number;
};

export type LevelResult = LevelResultData & StorageRecord;

/** The best accuracy and combo a Level's saved runs reached. */
export type LevelBest = {
  accuracy: number;
  combo: number;
};

export interface GameStorage {
  loadProfile(): Promise<PlayerProfile | null>;
  saveProfile(profile: PlayerProfile): Promise<void>;
  saveLevelResult(result: LevelResult): Promise<void>;
  loadLevelResults(): Promise<LevelResult[]>;
  /** Forget every saved run; settings survive (ticket #6's Reset progress). */
  clearLevelResults(): Promise<void>;
}

/** The run's accuracy as the HUD reports it: rounded 0–100, 100 when nothing typed. */
export function accuracyPercent(correctKeys: number, incorrectKeys: number): number {
  const total = correctKeys + incorrectKeys;
  return total === 0 ? 100 : Math.round((correctKeys / total) * 100);
}

/** Record factory for the player's profile; the caller stamps the clock. */
export function newProfile(settings: GameSettings, now = new Date().toISOString()): PlayerProfile {
  return {
    settings,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
  };
}

/** The profile with new settings applied: identity preserved, clock advanced. */
export function withSettings(
  profile: PlayerProfile,
  settings: GameSettings,
  now = new Date().toISOString(),
): PlayerProfile {
  return { ...profile, settings, updatedAt: now };
}

/** The best accuracy and best combo a Level's saved runs reached, or null. */
export function bestOfResults(
  results: LevelResult[],
  levelId: string,
): LevelBest | null {
  const forLevel = results.filter((result) => result.levelId === levelId);
  if (forLevel.length === 0) return null;
  return {
    accuracy: Math.max(...forLevel.map((result) => result.accuracy)),
    combo: Math.max(...forLevel.map((result) => result.bestCombo)),
  };
}

/** Record factory for a completed run; the caller stamps the clock. */
export function newLevelResult(data: LevelResultData, now = new Date().toISOString()): LevelResult {
  return {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
  };
}
