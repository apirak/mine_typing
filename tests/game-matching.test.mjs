import assert from "node:assert/strict";
import test, { after } from "node:test";

import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@" : root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

const { applyKey, enemies, progress } = await vite.ssrLoadModule(
  "/lib/game/matching.ts",
);

// Level 1-1's content: f, fj, j, jf. Two-letter words let a Candidate Group
// stay open across keys, so the narrowing cases use those. Matching is
// case-sensitive (spec #15): Word data spells out exactly what to type.
const fresh = () => enemies([{ id: 1, word: "f" }, { id: 2, word: "fj" }, { id: 3, word: "j" }, { id: 4, word: "jf" }]);
const pair = () => enemies([{ id: 1, word: "fj" }, { id: 2, word: "jf" }]);
const freshProgress = () => progress();

test("candidate group opens on the first matching key", () => {
  const result = applyKey(pair(), freshProgress(), "f");

  assert.equal(result.event.kind, "hit");
  assert.equal(result.progress.sequence, "f");
  assert.equal(result.progress.hits, 1);
  assert.equal(result.progress.combo, 1);
  assert.equal(result.progress.misses, 0);
  assert.deepEqual(result.event.hitIds.sort(), [1]);
  assert.equal(result.enemies.filter((enemy) => enemy.defeated).length, 0);
});

test("a second key narrows the group to the word that continues", () => {
  const first = applyKey(pair(), freshProgress(), "f");
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
  const first = applyKey(pair(), freshProgress(), "f");
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
  ({ enemies: state, progress: prog } = applyKey(state, prog, "j"));

  assert.equal(prog.sequence, "j");
  assert.equal(state.filter((enemy) => enemy.defeated).length, 0);
  ({ enemies: state, progress: prog } = applyKey(state, prog, "f"));

  assert.equal(prog.sequence, "");
  assert.deepEqual(
    state.filter((enemy) => enemy.defeated).map((enemy) => enemy.id).sort(),
    [2],
  );
});

test("a single-letter word defeats its enemy immediately and resets the group", () => {
  const result = applyKey(fresh(), freshProgress(), "f");

  assert.equal(result.event.kind, "defeat");
  assert.equal(result.progress.sequence, "");
  assert.deepEqual(result.event.defeatedIds, [1]);
  assert.deepEqual(result.event.hitIds, [1, 2]);
});

test("identical words are defeated together", () => {
  const doubled = enemies([{ id: 7, word: "jj" }, { id: 8, word: "jj" }, { id: 9, word: "j" }]);
  let state = doubled;
  let prog = freshProgress();
  ({ enemies: state, progress: prog } = applyKey(state, prog, "j"));
  assert.deepEqual(prog.sequence, "");

  ({ enemies: state, progress: prog } = applyKey(state, prog, "j"));
  ({ enemies: state, progress: prog } = applyKey(state, prog, "j"));

  assert.deepEqual(
    state.filter((enemy) => enemy.defeated).map((enemy) => enemy.id).sort(),
    [7, 8, 9],
  );
});

test("defeated enemies no longer match", () => {
  let state = enemies([{ id: 1, word: "f" }]);
  let prog = freshProgress();
  ({ enemies: state, progress: prog } = applyKey(state, prog, "f"));

  const result = applyKey(state, prog, "f");
  assert.equal(result.event.kind, "miss");
  assert.equal(result.progress.hits, 1);
  assert.equal(result.progress.misses, 1);
});

test("hits and combo accumulate while Level 1-1 clears fully", () => {
  let state = fresh();
  let prog = freshProgress();
  // "f" and "j" single-letter words die instantly (resetting the group),
  // so clearing fj and jf needs each pair typed in full.
  for (const key of ["f", "f", "j", "j", "j", "f"]) {
    const result = applyKey(state, prog, key);
    state = result.enemies;
    prog = result.progress;
  }

  assert.equal(prog.hits, 6);
  assert.equal(prog.misses, 0);
  assert.equal(prog.combo, 6);
  assert.equal(state.filter((enemy) => enemy.defeated).length, 4);
});

// Case sensitivity, digits, and punctuation: the curriculum's Worlds 4–5
// type capitals with Shift and `. , ! ? '` as ordinary keys (spec #15).

test("matching is case-sensitive: a lowercase key never matches a capital Word", () => {
  const state = enemies([{ id: 1, word: "We" }, { id: 2, word: "eat" }]);

  let result = applyKey(state, freshProgress(), "w");
  assert.equal(result.event.kind, "miss", "lowercase w matches nothing: 'We' needs the capital");

  result = applyKey(state, freshProgress(), "W");
  assert.equal(result.event.kind, "hit", "the capital opens 'We'");
});

test("a Shift capital matches a Word's capital exactly", () => {
  const state = enemies([{ id: 1, word: "I" }, { id: 2, word: "can" }]);
  let prog = freshProgress();

  let result = applyKey(state, prog, "i");
  assert.equal(result.event.kind, "miss", "lowercase i must not match 'I'");

  result = applyKey(state, prog, "I");
  assert.equal(result.event.kind, "defeat");
  assert.deepEqual(result.event.defeatedIds, [1]);
});

test("digits and punctuation are ordinary matchable keys", () => {
  const state = enemies([{ id: 1, word: "78" }, { id: 2, word: "n.n." }, { id: 3, word: "can't" }]);
  let current = { enemies: state, progress: freshProgress() };

  let result = applyKey(current.enemies, current.progress, "7");
  assert.equal(result.event.kind, "hit");
  result = applyKey(result.enemies, result.progress, "8");
  assert.equal(result.event.kind, "defeat");
  assert.deepEqual(result.event.defeatedIds, [1]);

  for (const key of ["n", ".", "n", "."]) {
    result = applyKey(result.enemies, result.progress, key);
  }
  assert.deepEqual(result.event.defeatedIds, [2]);

  for (const key of ["c", "a", "n", "'", "t"]) {
    result = applyKey(result.enemies, result.progress, key);
  }
  assert.deepEqual(result.event.defeatedIds, [3]);
});

test("keys outside the game keyspace return null so callers can ignore them", () => {
  assert.equal(applyKey(pair(), freshProgress(), " "), null);
  assert.equal(applyKey(pair(), freshProgress(), "Shift"), null);
  assert.equal(applyKey(pair(), freshProgress(), "Enter"), null);
  assert.equal(applyKey(pair(), freshProgress(), "ฟ"), null);
});
