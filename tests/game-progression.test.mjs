import assert from "node:assert/strict";
import test, { after } from "node:test";

import { createServer } from "vite";
import { fileURLToPath } from "node:url";

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

const {
  starsFor,
  cpm,
  completedLevelIds,
  isLevelUnlocked,
  nextLevelId,
} = await vite.ssrLoadModule("/lib/game/progression.ts");
const { ALL_LEVELS } = await vite.ssrLoadModule("/lib/game/levels.ts");

const ALL_IDS = ALL_LEVELS.map((level) => level.id);

// Star rules (plan_a §11): finishing earns one star, ≥90% accuracy a
// second, and ≥95% accuracy within the Level's time target the third.
const level1 = { timeTarget: 40 };

test("any finished run earns its first star", () => {
  assert.equal(starsFor({ accuracy: 12, elapsedSeconds: 999 }, level1), 1);
});

test("a second star needs at least 90 percent accuracy, any time", () => {
  assert.equal(starsFor({ accuracy: 89, elapsedSeconds: 10 }, level1), 1);
  assert.equal(starsFor({ accuracy: 90, elapsedSeconds: 999 }, level1), 2);
});

test("a third star needs 95 percent accuracy within the time target", () => {
  assert.equal(starsFor({ accuracy: 94, elapsedSeconds: 10 }, level1), 2);
  assert.equal(starsFor({ accuracy: 95, elapsedSeconds: 41 }, level1), 2);
  assert.equal(starsFor({ accuracy: 95, elapsedSeconds: 40 }, level1), 3);
  assert.equal(starsFor({ accuracy: 100, elapsedSeconds: 39.5 }, level1), 3);
});

test("CPM counts correct keys per minute of the run", () => {
  assert.equal(cpm(48, 96), 30);
  assert.equal(cpm(10, 60), 10);
  assert.equal(cpm(5, 0), 0);
  assert.equal(cpm(0, 30), 0);
});

test("completed Level ids are the distinct saved result levels", () => {
  const completed = completedLevelIds([
    { levelId: "1-1" },
    { levelId: "1-1" },
    { levelId: "3-1" },
  ]);
  assert.deepEqual([...completed].sort(), ["1-1", "3-1"]);
  assert.deepEqual([...completedLevelIds([])], []);
});

test("the first Level is always unlocked; later Levels need the previous one completed", () => {
  assert.equal(isLevelUnlocked("1-1", new Set()), true);
  assert.equal(isLevelUnlocked("1-2", new Set()), false);
  assert.equal(isLevelUnlocked("1-2", new Set(["1-1"])), true);
  assert.equal(isLevelUnlocked("1-5", new Set(["1-1", "1-2", "1-3", "1-4"])), true);
  assert.equal(isLevelUnlocked("2-1", new Set(["1-1", "1-2", "1-3", "1-4"])), false);
});

test("completing a World's last Level unlocks the next World's first", () => {
  assert.equal(isLevelUnlocked("2-1", new Set(["1-5"])), true);
  assert.equal(isLevelUnlocked("3-1", new Set(["2-10"])), true);
  assert.equal(isLevelUnlocked("4-1", new Set(["3-9"])), true);
  assert.equal(isLevelUnlocked("5-1", new Set(["4-6"])), true);
});

test("an unknown Level id is never unlocked and has no next Level", () => {
  assert.equal(isLevelUnlocked("99", new Set(ALL_IDS.slice(0, 33))), false);
  assert.equal(nextLevelId("99"), null);
  // The retired World-1-only ids are unknown now.
  assert.equal(isLevelUnlocked("3", new Set(ALL_IDS)), false);
  assert.equal(nextLevelId("3"), null);
});

test("the next Level follows the curriculum's order and stops at the last", () => {
  assert.equal(nextLevelId("1-1"), "1-2");
  assert.equal(nextLevelId("1-5"), "2-1");
  assert.equal(nextLevelId("2-10"), "3-1");
  assert.equal(nextLevelId("3-9"), "4-1");
  assert.equal(nextLevelId("4-6"), "5-1");
  assert.equal(nextLevelId("5-4"), null);
});
