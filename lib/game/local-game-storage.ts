// Phase 1 GameStorage over a Storage-like backing (browser localStorage in
// production, an injected fake in tests). Reads never crash on foreign or
// malformed data: a record whose schemaVersion is not readable (current or
// the previous one, which migrates on load — spec #15's id renumbering) is
// treated as absent, so a future app version's writes stay harmless here.

import {
  READABLE_SCHEMA_VERSIONS,
  SCHEMA_VERSION,
  migratedLevelId,
  type LevelResult,
  type PlayerProfile,
} from "./storage";

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const PROFILE_KEY = "mine_typing:profile";
const RESULTS_KEY = "mine_typing:level-results";

const readJson = (backing: StorageLike, key: string): unknown => {
  const raw = backing.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isReadableSchema = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && READABLE_SCHEMA_VERSIONS.includes(value.schemaVersion as number);

// Records from the previous schema are restamped to the current one as they
// are read, so the rest of the app only ever sees current-version data.
const toCurrentSchema = <T extends { schemaVersion: number }>(record: T): T =>
  record.schemaVersion === SCHEMA_VERSION
    ? record
    : { ...record, schemaVersion: SCHEMA_VERSION };

const isBoolean = (value: unknown): boolean => typeof value === "boolean";

/** Number within an inclusive range; the settings' volume is 0–100. */
const isBoundedNumber = (value: unknown, min: number, max: number): boolean =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

// Ticket #6 grew the records (music/volume, run time) without a schema
// bump: fields a pre-#6 app never wrote stay optional to the reader, so
// upgrading never reads a player's old records as absent. A present field
// with a damaged type still rejects the record, as before.

const isValidSettings = (value: unknown): boolean =>
  isRecord(value) &&
  isBoolean(value.sound) &&
  (value.music === undefined || isBoolean(value.music)) &&
  (value.volume === undefined || isBoundedNumber(value.volume, 0, 100)) &&
  (value.reducedMotion === null || isBoolean(value.reducedMotion)) &&
  isBoolean(value.showVirtualKeyboard);

/** Schema version alone is not enough: a same-version record with a
 * damaged shape must read as absent rather than poison the store. */
const isValidProfile = (value: unknown): boolean =>
  isReadableSchema(value) && isValidSettings(value.settings);

const isValidResult = (value: unknown): boolean =>
  isReadableSchema(value) &&
  typeof value.levelId === "string" &&
  typeof value.accuracy === "number" &&
  typeof value.correctKeys === "number" &&
  typeof value.incorrectKeys === "number" &&
  typeof value.bestCombo === "number" &&
  (value.elapsedSeconds === undefined || typeof value.elapsedSeconds === "number");

export function createLocalGameStorage(backing: StorageLike) {
  const writeJson = (key: string, value: unknown) =>
    backing.setItem(key, JSON.stringify(value));

  const loadLevelResults = async (): Promise<LevelResult[]> => {
    const value = readJson(backing, RESULTS_KEY);
    if (!Array.isArray(value)) return [];
    return value
      .filter(isValidResult)
      // v1 ids ("1"–"5") map onto the curriculum ids ("1-1"–"1-5") here, so
      // unlocks and bests survive the renumbering.
      .map((result) => toCurrentSchema({
        ...result,
        levelId: migratedLevelId(result.levelId),
      }) as LevelResult);
  };

  return {
    loadProfile: async (): Promise<PlayerProfile | null> => {
      const value = readJson(backing, PROFILE_KEY);
      return isValidProfile(value) ? toCurrentSchema(value as PlayerProfile) : null;
    },

    saveProfile: async (profile: PlayerProfile) => {
      writeJson(PROFILE_KEY, profile);
    },

    saveLevelResult: async (result: LevelResult) => {
      const results = await loadLevelResults();
      writeJson(RESULTS_KEY, [...results, result]);
    },

    loadLevelResults,

    // Reset progress (ticket #6) forgets runs only: the Storage-like
    // backing has no delete, and an empty array reads exactly like one.
    clearLevelResults: async () => {
      writeJson(RESULTS_KEY, []);
    },
  };
}
