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

const { WORLDS, ALL_LEVELS, getLevel, levelWords, pairSpawnChance, KEY_FINGERS } =
  await vite.ssrLoadModule("/lib/game/levels.ts");
const { applyKey, enemies, progress } = await vite.ssrLoadModule(
  "/lib/game/matching.ts",
);

// The curriculum data is the work order (spec #15): these tests hold the
// transcription to plan/level.md — queue shapes, variant rules, difficulty
// tables, and the learned-key contract over all 34 Levels.

const LEVEL_COUNTS = [5, 10, 9, 6, 4];
const ENTRY_COUNTS = [
  12, 15, 16, 18, 20,
  16, 16, 16, 18, 16, 18, 17, 20, 17, 22,
  18, 12, 14, 13, 14, 13, 15, 10, 8,
  14, 11, 12, 11, 13, 12,
  11, 12, 13, 13,
];
const WALK_SPEEDS = [
  0.85, 0.9, 1, 1.1, 1.2,
  1.05, 1.15, 1.2, 1.2, 1.25, 1.25, 1.3, 1.3, 1.35, 1.35,
  1.3, 1.3, 1.3, 1.35, 1.35, 1.4, 1.5, 1.25, 1.2,
  1.3, 1.25, 1.35, 1.4, 1.4, 1.45,
  1.45, 1.5, 1.55, 1.6,
];
const SPAWN_INTERVALS = [
  5.5, 5, 4.5, 4, 3.6,
  4.2, 4.2, 3.8, 4, 3.4, 3.8, 3.4, 3.6, 3.4, 3.4,
  4.2, 5.5, 5.2, 5, 5, 4.6, 4.6, 7.5, 8,
  4.2, 4.8, 4, 4.6, 4.2, 4.8,
  4.6, 4.8, 4, 5,
];
const TIME_TARGETS = [
  70, 82, 77, 77, 77,
  76, 74, 70, 78, 62, 74, 65, 78, 66, 80,
  80, 72, 79, 71, 77, 66, 76, 80, 68,
  66, 61, 56, 58, 62, 65,
  59, 66, 61, 74,
];

test("five Worlds ship 34 Levels with stable curriculum ids", () => {
  assert.deepEqual(WORLDS.map((world) => world.levels.length), LEVEL_COUNTS);
  assert.equal(ALL_LEVELS.length, 34);
  assert.deepEqual(
    WORLDS.flatMap((world) => world.levels.map((level) => level.id)),
    ALL_LEVELS.map((level) => level.id),
  );
  assert.equal(ALL_LEVELS[0].id, "1-1");
  assert.equal(ALL_LEVELS[33].id, "5-4");
  ALL_LEVELS.forEach((level) => {
    assert.ok(/^\d+-\d+$/.test(level.id), `${level.id} is not "<world>-<level>"`);
    assert.equal(level.world, Number(level.id.split("-")[0]));
  });
});

test("each World carries its Enemy kind and Level Select header", () => {
  assert.deepEqual(
    WORLDS.map((world) => world.label),
    ["ZOMBIE WORLD", "SKELETON WORLD", "CREEPER WORLD", "WITCH WORLD", "LITTLE ZOMBIE WORLD"],
  );
  assert.deepEqual(
    WORLDS.map((world) => world.levels[0].enemyKind),
    ["zombie", "skeleton", "creeper", "witch", "little-zombie"],
  );
});

test("every Level's queue length matches the plan", () => {
  ALL_LEVELS.forEach((level, index) => {
    assert.equal(
      level.entries.length,
      ENTRY_COUNTS[index],
      `${level.id} queues ${level.entries.length} Enemies, plan says ${ENTRY_COUNTS[index]}`,
    );
  });
});

test("every Level's difficulty numbers match the plan", () => {
  ALL_LEVELS.forEach((level, index) => {
    assert.equal(level.walkSpeed, WALK_SPEEDS[index], `${level.id} walkSpeed`);
    assert.equal(level.spawnInterval, SPAWN_INTERVALS[index], `${level.id} spawnInterval`);
    assert.equal(level.timeTarget, TIME_TARGETS[index], `${level.id} timeTarget`);
  });
});

test("trained keys accumulate into learned keys across the whole curriculum", () => {
  const learned = new Set();
  for (const level of ALL_LEVELS) {
    for (const key of level.trainedKeys) learned.add(key);
    for (const key of level.trainedKeys) {
      assert.ok(level.learnedKeys.includes(key), `${level.id} does not learn its own ${key}`);
    }
    assert.deepEqual(
      new Set(level.learnedKeys),
      learned,
      `${level.id} learnedKeys diverge from the accumulated set`,
    );
  }
});

test("every Word uses only keys learned up to its Level", () => {
  for (const level of ALL_LEVELS) {
    const learned = new Set(level.learnedKeys);
    for (const entry of level.entries) {
      for (const char of entry.word) {
        const key = /[a-z]/i.test(char) ? char.toUpperCase() : char;
        assert.ok(
          learned.has(key),
          `${level.id} word "${entry.word}" types unlearned key "${key}"`,
        );
      }
    }
  }
});

test("capital letters appear only from the Shift Level (4-2) onward", () => {
  for (const level of ALL_LEVELS) {
    const shiftTaught = level.world > 4 || (level.world === 4 && Number(level.id.split("-")[1]) >= 2);
    for (const entry of level.entries) {
      if (!/[A-Z]/.test(entry.word)) continue;
      assert.ok(
        shiftTaught,
        `${level.id} word "${entry.word}" uses Shift before it is taught`,
      );
    }
  }
});

test("runner Words stay short enough to out-type their speed", () => {
  for (const level of ALL_LEVELS) {
    for (const entry of level.entries) {
      if (entry.variant !== "runner") continue;
      const maxLength = level.world <= 2 ? 1 : 2;
      assert.ok(
        entry.word.length <= maxLength,
        `${level.id} runner carries "${entry.word}" (${entry.word.length} > ${maxLength})`,
      );
    }
  }
});

test("runners first appear at 1-3; the two openers have none", () => {
  for (const level of ALL_LEVELS.filter((l) => ["1-1", "1-2"].includes(l.id))) {
    assert.equal(
      level.entries.filter((entry) => entry.variant === "runner").length,
      0,
      `${level.id} must spawn no runners`,
    );
  }
  const firstRunner = ALL_LEVELS.find((level) =>
    level.entries.some((entry) => entry.variant === "runner"),
  );
  assert.equal(firstRunner.id, "1-3");
});

test("tanks carry long Words only in the designed crowd Levels 3-8 and 3-9", () => {
  for (const level of ALL_LEVELS) {
    for (const entry of level.entries) {
      if (entry.variant === "tank") {
        assert.ok(
          ["3-8", "3-9"].includes(level.id),
          `${level.id} has a tank but only 3-8/3-9 design them`,
        );
        assert.ok(entry.word.length >= 5, `${level.id} tank word "${entry.word}" is not long`);
      }
    }
  }
  assert.ok(getLevel("3-8").entries.some((entry) => entry.variant === "tank"));
  assert.ok(getLevel("3-9").entries.some((entry) => entry.variant === "tank"));
});

test("every queue entry carries a known variant (field completeness)", () => {
  for (const level of ALL_LEVELS) {
    for (const entry of level.entries) {
      assert.ok(
        entry.word.length > 0,
        `${level.id} queues an empty Word`,
      );
      assert.ok(
        ["runner", "tank", undefined].includes(entry.variant),
        `${level.id} entry "${entry.word}" has unknown variant ${entry.variant}`,
      );
    }
  }
});

test("every trained key is actually exercised by its Level's queue", () => {
  for (const level of ALL_LEVELS) {
    const queue = levelWords(level).join("").toLowerCase();
    for (const key of level.trainedKeys) {
      assert.ok(queue.includes(key.toLowerCase()), `${level.id} never practices ${key}`);
    }
  }
});

test("every trained key documents its finger for the hint line", () => {
  for (const level of ALL_LEVELS) {
    for (const key of level.trainedKeys) {
      assert.match(KEY_FINGERS[key], /finger/i, `${level.id} key ${key} has no finger`);
    }
  }
});

test("pair-spawn chances follow the plan's world tiers", () => {
  const byId = Object.fromEntries(ALL_LEVELS.map((level) => [level.id, pairSpawnChance(level)]));
  assert.equal(byId["1-1"], 0);
  assert.equal(byId["1-2"], 0);
  assert.equal(byId["1-3"], 0.1);
  assert.equal(byId["1-5"], 0.1);
  assert.equal(byId["2-1"], 0.1);
  assert.equal(byId["2-10"], 0.1);
  assert.equal(byId["3-1"], 0.15);
  assert.equal(byId["4-6"], 0.15);
  assert.equal(byId["5-1"], 0.2);
  assert.equal(byId["5-4"], 0.2);
});

test("getLevel resolves route ids and rejects unknown and retired ones", () => {
  assert.equal(getLevel("1-1"), ALL_LEVELS[0]);
  assert.equal(getLevel("5-4"), ALL_LEVELS[33]);
  assert.equal(getLevel("99"), undefined);
  assert.equal(getLevel("3"), undefined, "the old World-1 ids are gone");
});

test("Level 1-1 keeps the plan's opener queue", () => {
  assert.deepEqual(levelWords(getLevel("1-1")), [
    "f", "j", "f", "fj", "j", "jf", "f", "j", "fj", "jf", "fj", "j",
  ]);
});

test("sentence Levels are word-enemies in reading order, 4-2's opener intact", () => {
  assert.deepEqual(levelWords(getLevel("4-2")).slice(0, 4), ["I", "can", "run.", "We"]);
  assert.deepEqual(levelWords(getLevel("5-4")).slice(-2), ["super", "power!"]);
});

test("a full playthrough of the first Level is typeable with the matching rules", () => {
  // Smoke the data through the real matching seam: 1-1 clears key by key.
  let state = enemies(ALL_LEVELS[0].entries.map((entry, index) => ({
    id: index + 1,
    word: entry.word,
  })));
  let prog = progress();
  for (const word of levelWords(ALL_LEVELS[0])) {
    for (const char of word) {
      const result = applyKey(state, prog, char);
      assert.ok(result, `key ${char} of "${word}" rejected`);
      ({ enemies: state, progress: prog } = result);
    }
  }
  assert.equal(state.filter((enemy) => enemy.defeated).length, ENTRY_COUNTS[0]);
});
