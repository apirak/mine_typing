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

const { WORLD_ONE, getLevel, KEY_FINGERS } = await vite.ssrLoadModule(
  "/lib/game/levels.ts",
);
const { applyKey, enemies, progress } = await vite.ssrLoadModule(
  "/lib/game/matching.ts",
);
const { createMotion, stepMotion, SPAWN_X } = await vite.ssrLoadModule(
  "/lib/game/movement.ts",
);

const alive = (...ids) => new Set(ids);
const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${expected}, got ${actual}`);

test("World 1 ships five Levels at stable route ids", () => {
  assert.equal(WORLD_ONE.length, 5);
  assert.deepEqual(WORLD_ONE.map((level) => level.id), ["1", "2", "3", "4", "5"]);
  assert.deepEqual(
    WORLD_ONE.map((level) => level.name),
    [
      "Level 1 · F + J",
      "Level 2 · D + K",
      "Level 3 · S + L",
      "Level 4 · A + ;",
      "Level 5 · G + H",
    ],
  );
});

test("each Level trains new keys; learned keys accumulate across Levels", () => {
  for (const level of WORLD_ONE) {
    assert.ok(level.trainedKeys.length >= 2, `${level.id} trains too few keys`);
    for (const key of level.trainedKeys) {
      assert.ok(level.learnedKeys.includes(key), `${key} not learned at ${level.id}`);
    }
  }
  for (let index = 1; index < WORLD_ONE.length; index += 1) {
    const previous = WORLD_ONE[index - 1];
    const level = WORLD_ONE[index];
    for (const key of previous.learnedKeys) {
      assert.ok(
        level.learnedKeys.includes(key),
        `${level.id} forgot ${key} from ${previous.id}`,
      );
    }
  }
});

test("every Level's Words use only keys learned up to that Level, 1–4 letters", () => {
  for (const level of WORLD_ONE) {
    const learned = new Set(level.learnedKeys);
    for (const word of level.words) {
      assert.ok(
        word.length >= 1 && word.length <= 4,
        `${level.id} word "${word}" breaks the 1–4 letter shape`,
      );
      for (const char of word) {
        assert.ok(learned.has(char), `${level.id} word "${word}" uses unlearned "${char}"`);
      }
    }
  }
});

test("each trained key is actually exercised by its Level's Word pool", () => {
  for (const level of WORLD_ONE) {
    const pool = level.words.join("");
    for (const key of level.trainedKeys) {
      assert.ok(pool.includes(key), `${level.id} never practices ${key}`);
    }
  }
});

test("Level 1 keeps the previously shipped queue so the default route behaves as before", () => {
  assert.deepEqual(WORLD_ONE[0].words, ["F", "FJ", "J", "JF"]);
});

test("each Level carries positive speed, spawn interval, and time target", () => {
  for (const level of WORLD_ONE) {
    assert.ok(level.walkSpeed > 0, `${level.id} walkSpeed`);
    assert.ok(level.spawnInterval > 0, `${level.id} spawnInterval`);
    assert.ok(level.timeTarget > 0, `${level.id} timeTarget`);
  }
  // Difficulty ramps: later Levels never walk slower or spawn later.
  for (let index = 1; index < WORLD_ONE.length; index += 1) {
    assert.ok(WORLD_ONE[index].walkSpeed >= WORLD_ONE[index - 1].walkSpeed);
    assert.ok(WORLD_ONE[index].spawnInterval <= WORLD_ONE[index - 1].spawnInterval);
  }
});

test("every trained key documents its finger for the hint line", () => {
  for (const level of WORLD_ONE) {
    for (const key of level.trainedKeys) {
      assert.match(KEY_FINGERS[key], /finger/i, `${level.id} key ${key} has no finger`);
    }
  }
});

test("getLevel resolves route ids and rejects unknown ones", () => {
  assert.equal(getLevel("3"), WORLD_ONE[2]);
  assert.equal(getLevel("99"), undefined);
});

test("Enemy walking honors the Level's speed and spawn interval", () => {
  const level = WORLD_ONE[2];
  let world = createMotion(level.words, {
    walkSpeed: level.walkSpeed,
    spawnInterval: level.spawnInterval,
  });
  close(world.walking[0].x, SPAWN_X);

  let step = stepMotion(world, 1, alive(1));
  close(step.world.walking[0].x, SPAWN_X - level.walkSpeed);
  close(step.world.spawnIn, level.spawnInterval - 1);
  assert.deepEqual(step.spawnedIds, []);

  step = stepMotion(step.world, level.spawnInterval - 1, alive(1, 2));
  assert.deepEqual(step.spawnedIds, [2]);
});

test("the semicolon key works so Level 4 is playable", () => {
  const fresh = () => enemies([{ id: 1, word: "A;" }, { id: 2, word: ";" }]);
  let state = fresh();
  let prog = progress();

  ({ enemies: state, progress: prog } = applyKey(state, prog, "a"));
  assert.equal(prog.sequence, "A");

  ({ enemies: state, progress: prog } = applyKey(state, prog, ";"));
  assert.deepEqual(prog.sequence, "");
  assert.deepEqual(
    state.filter((enemy) => enemy.defeated).map((enemy) => enemy.id),
    [1],
  );

  const result = applyKey(state, prog, ";");
  assert.equal(result.event.kind, "defeat");
  assert.deepEqual(result.event.defeatedIds, [2]);
});
