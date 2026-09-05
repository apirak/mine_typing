import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

const { bestOfResults, newLevelResult, newProfile, withSettings } =
  await vite.ssrLoadModule("/lib/game/storage.ts");
const { createLocalGameStorage } = await vite.ssrLoadModule(
  "/lib/game/local-game-storage.ts",
);

// The seam stays browser-free: the Phase 1 implementation is exercised
// against a Storage-like fake, never real window.localStorage.
const fakeBacking = () => {
  const entries = new Map();
  return {
    getItem: (key) => (entries.has(key) ? entries.get(key) : null),
    setItem: (key, value) => entries.set(key, value),
  };
};

test("saveLevelResult assigns record fields and loadLevelResults reads the equivalent record back", async () => {
  const storage = createLocalGameStorage(fakeBacking());

  const record = newLevelResult(
    {
      levelId: "1",
      accuracy: 96,
      correctKeys: 48,
      incorrectKeys: 2,
      bestCombo: 18,
    },
    "2026-09-05T10:00:00.000Z",
  );

  // Every stored record carries the contract fields (spec #2).
  assert.equal(record.schemaVersion, 1);
  assert.ok(record.id);
  assert.equal(record.createdAt, "2026-09-05T10:00:00.000Z");
  assert.equal(record.updatedAt, "2026-09-05T10:00:00.000Z");

  await storage.saveLevelResult(record);
  const results = await storage.loadLevelResults();

  assert.equal(results.length, 1);
  assert.deepEqual(results[0], record);
});

test("bestOfResults takes the best accuracy and best combo across a Level's runs, from different runs", () => {
  const run = (levelId, accuracy, bestCombo) => ({
    levelId, accuracy, bestCombo,
    id: `run-${levelId}-${accuracy}`, createdAt: "2026-09-05T10:00:00.000Z",
    updatedAt: "2026-09-05T10:00:00.000Z", schemaVersion: 1,
  });
  const results = [run("1", 90, 12), run("1", 96, 7), run("2", 100, 20)];

  assert.deepEqual(bestOfResults(results, "1"), { accuracy: 96, combo: 12 });
  assert.deepEqual(bestOfResults(results, "2"), { accuracy: 100, combo: 20 });
});

test("bestOfResults returns null for a Level with no saved results", () => {
  assert.equal(bestOfResults([], "1"), null);
});

const DEFAULT_SETTINGS = { sound: true, reducedMotion: null, showVirtualKeyboard: true };

test("settings round-trip through newProfile, saveProfile, and loadProfile", async () => {
  const storage = createLocalGameStorage(fakeBacking());
  const profile = newProfile(
    { ...DEFAULT_SETTINGS, sound: false },
    "2026-09-05T10:00:00.000Z",
  );

  assert.equal(profile.schemaVersion, 1);
  assert.equal(profile.settings.sound, false);

  await storage.saveProfile(profile);
  const loaded = await storage.loadProfile();

  assert.deepEqual(loaded, profile);
});

test("withSettings replaces the settings and stamps updatedAt, keeping identity", () => {
  const profile = newProfile({ ...DEFAULT_SETTINGS }, "2026-09-05T10:00:00.000Z");
  const updated = withSettings(
    profile,
    { ...DEFAULT_SETTINGS, showVirtualKeyboard: false },
    "2026-09-05T11:00:00.000Z",
  );

  assert.equal(updated.id, profile.id);
  assert.equal(updated.createdAt, "2026-09-05T10:00:00.000Z");
  assert.equal(updated.updatedAt, "2026-09-05T11:00:00.000Z");
  assert.equal(updated.settings.showVirtualKeyboard, false);
  assert.equal(profile.settings.showVirtualKeyboard, true);
});

test("a record from a future schemaVersion is ignored, not crashed on", async () => {
  const backing = fakeBacking();
  const storage = createLocalGameStorage(backing);

  backing.setItem("mine_typing:profile", JSON.stringify({
    id: "from-the-future", settings: DEFAULT_SETTINGS,
    createdAt: "2030-01-01T00:00:00.000Z", updatedAt: "2030-01-01T00:00:00.000Z",
    schemaVersion: 999,
  }));
  backing.setItem("mine_typing:level-results", JSON.stringify([{
    levelId: "1", accuracy: 50, correctKeys: 1, incorrectKeys: 1, bestCombo: 1,
    id: "from-the-future", createdAt: "2030-01-01T00:00:00.000Z",
    updatedAt: "2030-01-01T00:00:00.000Z", schemaVersion: 999,
  }, newLevelResult({ levelId: "1", accuracy: 96, correctKeys: 48, incorrectKeys: 2, bestCombo: 18 })]));

  assert.equal(await storage.loadProfile(), null);
  assert.equal((await storage.loadLevelResults()).length, 1);
});

test("malformed stored JSON reads as absent instead of crashing", async () => {
  const backing = fakeBacking();
  const storage = createLocalGameStorage(backing);
  backing.setItem("mine_typing:profile", "{not json");
  backing.setItem("mine_typing:level-results", "[broken");

  assert.equal(await storage.loadProfile(), null);
  assert.deepEqual(await storage.loadLevelResults(), []);
});
