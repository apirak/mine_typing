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

const { applyKey, enemies, progress } = await vite.ssrLoadModule(
  "/lib/game/matching.ts",
);

// Level 1's content: F, FJ, J, JF. Two-letter words let a Candidate Group
// stay open across keys, so the narrowing cases use those.
const fresh = () => enemies([{ id: 1, word: "F" }, { id: 2, word: "FJ" }, { id: 3, word: "J" }, { id: 4, word: "JF" }]);
const pair = () => enemies([{ id: 1, word: "FJ" }, { id: 2, word: "JF" }]);
const freshProgress = () => progress();

test("candidate group opens on the first matching key", () => {
  const result = applyKey(pair(), freshProgress(), "f");

  assert.equal(result.event.kind, "hit");
  assert.equal(result.progress.sequence, "F");
  assert.equal(result.progress.hits, 1);
  assert.equal(result.progress.combo, 1);
  assert.equal(result.progress.misses, 0);
  assert.deepEqual(result.event.hitIds.sort(), [1]);
  assert.deepEqual(result.event.defeatedIds, []);
  assert.equal(result.enemies.filter((enemy) => enemy.defeated).length, 0);
});

test("a second key narrows the group to the word that continues", () => {
  const first = applyKey(pair(), freshProgress(), "F");
  const second = applyKey(first.enemies, first.progress, "j");

  assert.equal(second.event.kind, "defeat");
  assert.equal(second.progress.sequence, "");
  assert.deepEqual(second.event.defeatedIds, [1]);
  assert.deepEqual(second.event.hitIds, [1]);
  const byId = new Map(second.enemies.map((enemy) => [enemy.id, enemy]));
  assert.equal(byId.get(1).defeated, true);
  assert.equal(byId.get(2).defeated, false);
});

test("a non-matching key resets the group and counts a miss", () => {
  const first = applyKey(pair(), freshProgress(), "F");
  const second = applyKey(first.enemies, first.progress, "q");

  assert.equal(second.event.kind, "miss");
  assert.equal(second.progress.sequence, "");
  assert.equal(second.progress.misses, 1);
  assert.equal(second.progress.combo, 0);
  assert.equal(second.progress.hits, 1);
  assert.deepEqual(second.event.defeatedIds, []);
  assert.equal(second.enemies.filter((enemy) => enemy.defeated).length, 0);
});

test("completing a word clears the sequence so the next key opens a fresh group", () => {
  let state = pair();
  let prog = freshProgress();
  ({ enemies: state, progress: prog } = applyKey(state, prog, "J"));

  assert.equal(prog.sequence, "J");
  assert.equal(state.filter((enemy) => enemy.defeated).length, 0);
  ({ enemies: state, progress: prog } = applyKey(state, prog, "F"));

  assert.equal(prog.sequence, "");
  assert.deepEqual(
    state.filter((enemy) => enemy.defeated).map((enemy) => enemy.id).sort(),
    [2],
  );
});

test("a single-letter word defeats its enemy immediately and resets the group", () => {
  const result = applyKey(fresh(), freshProgress(), "F");

  assert.equal(result.event.kind, "defeat");
  assert.equal(result.progress.sequence, "");
  assert.deepEqual(result.event.defeatedIds, [1]);
  assert.deepEqual(result.event.hitIds, [1, 2]);
});

test("identical words are defeated together", () => {
  const doubled = enemies([{ id: 7, word: "JJ" }, { id: 8, word: "JJ" }, { id: 9, word: "J" }]);
  let state = doubled;
  let prog = freshProgress();
  ({ enemies: state, progress: prog } = applyKey(state, prog, "J"));
  assert.deepEqual(prog.sequence, "");

  ({ enemies: state, progress: prog } = applyKey(state, prog, "J"));
  ({ enemies: state, progress: prog } = applyKey(state, prog, "J"));

  assert.deepEqual(
    state.filter((enemy) => enemy.defeated).map((enemy) => enemy.id).sort(),
    [7, 8, 9],
  );
});

test("defeated enemies no longer match", () => {
  let state = enemies([{ id: 1, word: "F" }]);
  let prog = freshProgress();
  ({ enemies: state, progress: prog } = applyKey(state, prog, "F"));

  const result = applyKey(state, prog, "F");
  assert.equal(result.event.kind, "miss");
  assert.equal(result.progress.hits, 1);
  assert.equal(result.progress.misses, 1);
});

test("hits and combo accumulate while Level 1 clears fully", () => {
  let state = fresh();
  let prog = freshProgress();
  // "F" and "J" single-letter words die instantly (resetting the group),
  // so clearing FJ and JF needs each pair typed in full.
  for (const key of ["F", "F", "J", "J", "J", "F"]) {
    const result = applyKey(state, prog, key);
    state = result.enemies;
    prog = result.progress;
  }

  assert.equal(prog.hits, 6);
  assert.equal(prog.misses, 0);
  assert.equal(prog.combo, 6);
  assert.equal(state.filter((enemy) => enemy.defeated).length, 4);
});
