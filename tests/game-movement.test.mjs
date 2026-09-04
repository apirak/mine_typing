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
  createMotion,
  stepMotion,
  stunMotion,
  levelComplete,
  nearDanger,
  SPAWN_X,
  SPAWN_INTERVAL,
  WALK_SPEED,
  HIT_STOP,
  DANGER_X,
} = await vite.ssrLoadModule("/lib/game/movement.ts");

// Level 1's queue: the four Words from the static milestone, in spawn order.
const wave = ["F", "FJ", "J", "JF"];
const alive = (...ids) => new Set(ids);
const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${expected}, got ${actual}`);

test("the first Enemy starts at the spawn edge and the rest wait in the queue", () => {
  const world = createMotion(wave);

  assert.equal(world.walking.length, 1);
  assert.equal(world.walking[0].id, 1);
  close(world.walking[0].x, SPAWN_X);
  close(world.walking[0].stun, 0);
  assert.deepEqual(world.queue, [2, 3, 4]);
  close(world.spawnIn, SPAWN_INTERVAL);
});

test("Enemies walk toward the Player at one shared speed", () => {
  let world = createMotion(wave);
  world = stepMotion(world, SPAWN_INTERVAL, alive(1, 2)).world;

  const [first, second] = world.walking;
  const before = [first.x, second.x];
  world = stepMotion(world, 0.5, alive(1, 2)).world;

  close(world.walking[0].x, before[0] - WALK_SPEED * 0.5);
  close(world.walking[1].x, before[1] - WALK_SPEED * 0.5);
});

test("a correct key freezes the Enemy it hit, then it resumes walking", () => {
  let world = stunMotion(createMotion(wave), [1]);

  world = stepMotion(world, 0.1, alive(1)).world;
  close(world.walking[0].x, SPAWN_X);
  assert.ok(world.walking[0].stun > 0, "stun should outlast the step");

  world = stepMotion(world, HIT_STOP, alive(1)).world;
  close(world.walking[0].stun, 0);
  // 0.25 s of the step was still frozen, so only the remainder walks.
  close(world.walking[0].x, SPAWN_X - WALK_SPEED * 0.1);
});

test("defeated Enemies stop walking where they died", () => {
  let world = createMotion(wave);
  world = stepMotion(world, SPAWN_INTERVAL, alive(1)).world;
  const deadX = world.walking[1].x;

  // id 2 was defeated, so only id 1 is alive and advances.
  world = stepMotion(world, 1, alive(1)).world;

  close(world.walking[1].x, deadX);
  assert.ok(world.walking[0].x < world.walking[1].x);
});

test("the next Enemy joins in queue order only after the interval", () => {
  let step = stepMotion(createMotion(wave), SPAWN_INTERVAL - 0.01, alive(1));
  assert.deepEqual(step.spawnedIds, []);

  step = stepMotion(step.world, 0.01, alive(1));
  assert.deepEqual(step.spawnedIds, [2]);
  assert.equal(step.world.walking.length, 2);
  assert.equal(step.world.walking[1].id, 2);
  close(step.world.walking[1].x, SPAWN_X);
  assert.deepEqual(step.world.queue, [3, 4]);

  // The interval restarts from the spawn, not from the level start.
  step = stepMotion(step.world, SPAWN_INTERVAL - 0.01, alive(1, 2));
  assert.deepEqual(step.spawnedIds, []);
  step = stepMotion(step.world, 0.01, alive(1, 2));
  assert.deepEqual(step.spawnedIds, [3]);
});

test("spawns stop once the wave is exhausted", () => {
  let world = createMotion(wave);
  let step;
  for (let seen = 1; seen < wave.length; seen += 1) {
    step = stepMotion(world, SPAWN_INTERVAL, alive(...wave.map((_, i) => i + 1)));
    world = step.world;
  }
  assert.equal(world.queue.length, 0);
  assert.equal(world.walking.length, wave.length);

  step = stepMotion(world, SPAWN_INTERVAL * 3, alive(...wave.map((_, i) => i + 1)));
  assert.deepEqual(step.spawnedIds, []);
  assert.equal(step.world.walking.length, wave.length);
});

test("reaching the Danger Line ends the run — not a step before", () => {
  const near = createMotion(wave);
  near.walking[0].x = DANGER_X + WALK_SPEED * 0.2;
  let step = stepMotion(near, 0.1, alive(1));
  assert.equal(step.breached, false);
  assert.ok(step.world.walking[0].x > DANGER_X);

  step = stepMotion(step.world, 0.15, alive(1));
  assert.equal(step.breached, true);
  close(step.world.walking[0].x, DANGER_X);
});

test("the near-line warning flips only close to the line and ignores the defeated", () => {
  let world = createMotion(wave);
  assert.equal(nearDanger(world, alive(1)), false);

  world.walking[0].x = DANGER_X + 1;
  assert.equal(nearDanger(world, alive(1)), true);

  // A defeated Enemy frozen near the line must not warn.
  assert.equal(nearDanger(world, alive(2)), false);
});

test("the level is complete only when the queue is empty and every Enemy is defeated", () => {
  let world = createMotion(wave);
  assert.equal(levelComplete(world, 0), false);

  for (let seen = 1; seen < wave.length; seen += 1) {
    world = stepMotion(world, SPAWN_INTERVAL, alive(...wave.map((_, i) => i + 1))).world;
  }
  assert.equal(levelComplete(world, wave.length - 1), false);
  assert.equal(levelComplete(world, wave.length), true);
});
