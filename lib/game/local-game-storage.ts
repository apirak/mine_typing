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

const isCurrentSchema = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  (value as { schemaVersion?: unknown }).schemaVersion === SCHEMA_VERSION;

export function createLocalGameStorage(backing: StorageLike) {
  const writeJson = (key: string, value: unknown) =>
    backing.setItem(key, JSON.stringify(value));

  const loadLevelResults = async (): Promise<LevelResult[]> => {
    const value = readJson(backing, RESULTS_KEY);
    if (!Array.isArray(value)) return [];
    return value.filter(isCurrentSchema) as LevelResult[];
  };

  return {
    loadProfile: async (): Promise<PlayerProfile | null> => {
      const value = readJson(backing, PROFILE_KEY);
      return isCurrentSchema(value) ? (value as PlayerProfile) : null;
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
