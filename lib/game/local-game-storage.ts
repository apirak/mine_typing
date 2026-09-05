// Phase 1 GameStorage over a Storage-like backing (browser localStorage in
// production, an injected fake in tests). Reads never crash on foreign or
// malformed data: a record whose schemaVersion is not the current one is
// treated as absent, so a future app version's writes stay harmless here.

import {
  SCHEMA_VERSION,
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

const isCurrentSchema = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && value.schemaVersion === SCHEMA_VERSION;

const isBoolean = (value: unknown): boolean => typeof value === "boolean";

const isValidSettings = (value: unknown): boolean =>
  isRecord(value) &&
  isBoolean(value.sound) &&
  (value.reducedMotion === null || isBoolean(value.reducedMotion)) &&
  isBoolean(value.showVirtualKeyboard);

/** Schema version alone is not enough: a same-version record with a
 * damaged shape must read as absent rather than poison the store. */
const isValidProfile = (value: unknown): boolean =>
  isCurrentSchema(value) && isValidSettings(value.settings);

const isValidResult = (value: unknown): boolean =>
  isCurrentSchema(value) &&
  typeof value.levelId === "string" &&
  typeof value.accuracy === "number" &&
  typeof value.correctKeys === "number" &&
  typeof value.incorrectKeys === "number" &&
  typeof value.bestCombo === "number";

export function createLocalGameStorage(backing: StorageLike) {
  const writeJson = (key: string, value: unknown) =>
    backing.setItem(key, JSON.stringify(value));

  const loadLevelResults = async (): Promise<LevelResult[]> => {
    const value = readJson(backing, RESULTS_KEY);
    if (!Array.isArray(value)) return [];
    return value.filter(isValidResult) as LevelResult[];
  };

  return {
    loadProfile: async (): Promise<PlayerProfile | null> => {
      const value = readJson(backing, PROFILE_KEY);
      return isValidProfile(value) ? (value as PlayerProfile) : null;
    },

    saveProfile: async (profile: PlayerProfile) => {
      writeJson(PROFILE_KEY, profile);
    },

    saveLevelResult: async (result: LevelResult) => {
      const results = await loadLevelResults();
      writeJson(RESULTS_KEY, [...results, result]);
    },

    loadLevelResults,
  };
}
