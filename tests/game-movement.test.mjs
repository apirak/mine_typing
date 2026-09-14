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
  nearestVariant,
  SPAWN_X,
  SPAWN_INTERVAL,
  WALK_SPEED,
  HIT_STOP,
  DANGER_X,
  RUNNER_FACTOR,
  TANK_FACTOR,
  JITTER_MIN,
  JITTER_MAX,
} = await vite.ssrLoadModule("/lib/game/movement.ts");

// Level 1-1's queue shape, with one of each variant riding along: the pure
// module only reads the variant field, so plain objects stand in for data.
const wave = [{ variant: undefined }, {}, { variant: "runner" }, { variant: "tank" }];
const alive = (...ids) => new Set(ids);
const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${expected}, got ${actual}`);

test("the first Enemy starts at the spawn edge and the rest wait in the queue", () => {
  const world = createMotion(wave);

  assert.equal(world.walking.length, 1);
  assert.equal(world.walking[0].id, 1);
  close(world.walking[0].x, SPAWN_X);
  close(world.walking[0].stun, 0);
  assert.deepEqual(world.walking.map((enemy) => enemy.variant), ["walker"]);
  assert.deepEqual(world.queue.map((enemy) => enemy.id), [2, 3, 4]);
  assert.deepEqual(world.queue.map((enemy) => enemy.variant), ["walker", "runner", "tank"]);
  // The countdown targets the schedule's first jittered gap.
  assert.equal(world.schedule.length, 3);
  assert.equal(world.spawnIn, world.schedule[0].gap);
});

test("the seeded schedule is reproducible: same seed, same gaps and pair rolls", () => {
  const entries = Array.from({ length: 8 }, () => ({}));
  const a = createMotion(entries, { seed: 1234, pairChance: 0.5 });
  const b = createMotion(entries, { seed: 1234, pairChance: 0.5 });
  const c = createMotion(entries, { seed: 4321, pairChance: 0.5 });

  assert.deepEqual(a.schedule, b.schedule);
  assert.notDeepEqual(a.schedule, c.schedule);
});

test("every gap jitters uniformly inside [0.6, 1.4] × base", () => {
  for (let seed = 0; seed < 50; seed += 1) {
    const world = createMotion(Array.from({ length: 12 }, () => ({})), { seed });
    for (const event of world.schedule) {
      assert.ok(
        event.gap >= SPAWN_INTERVAL * JITTER_MIN - 1e-9,
        `gap ${event.gap} below the jitter floor (seed ${seed})`,
      );
      assert.ok(
        event.gap <= SPAWN_INTERVAL * JITTER_MAX + 1e-9,
        `gap ${event.gap} above the jitter ceiling (seed ${seed})`,
      );
    }
  }
});

test("pair spawns release two Enemies into one gap, up to the queue's size", () => {
  const world = createMotion(Array.from({ length: 5 }, () => ({})), {
    seed: 7,
    pairChance: 1,
  });

  assert.deepEqual(
    world.schedule.map((event) => event.count),
    [2, 2],
  );

  // Consuming the schedule spawns each pair together, in queue order.
  let step = stepMotion(world, world.spawnIn + 0.01, alive(1, 2, 3));
  assert.deepEqual(step.spawnedIds, [2, 3]);
  step = stepMotion(step.world, step.world.spawnIn + 0.01, alive(1, 2, 3, 4, 5));
  assert.deepEqual(step.spawnedIds, [4, 5]);
  assert.equal(step.world.queue.length, 0);
  assert.equal(step.world.schedule.length, 0);
});

test("pair rolls of zero keep every event single", () => {
  const world = createMotion(Array.from({ length: 6 }, () => ({})), {
    seed: 99,
    pairChance: 0,
  });
  assert.deepEqual(
    world.schedule.map((event) => event.count),
    [1, 1, 1, 1, 1],
  );
});

test("Enemies walk at their variant's speed: runner 1.3×, tank 0.75×", () => {
  let world = createMotion([{ variant: "runner" }, { variant: "tank" }, {}], {
    walkSpeed: 1,
  });
  for (let i = 0; i < 5 && world.queue.length > 0; i += 1) {
    world = stepMotion(world, world.spawnIn + 0.01, alive(1, 2, 3)).world;
  }
  assert.equal(world.walking.length, 3);

  const after = stepMotion(world, 1, alive(1, 2, 3)).world;
  close(after.walking[0].x, world.walking[0].x - RUNNER_FACTOR);
  close(after.walking[1].x, world.walking[1].x - TANK_FACTOR);
  close(after.walking[2].x, world.walking[2].x - 1);
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
  world = stepMotion(world, world.spawnIn, alive(1, 2)).world;
  const deadX = world.walking[1].x;

  // id 2 was defeated, so only id 1 is alive and advances.
  world = stepMotion(world, 1, alive(1)).world;

  close(world.walking[1].x, deadX);
  assert.ok(world.walking[0].x < world.walking[1].x);
});

test("spawn events fire in schedule order only after their gap", () => {
  let world = createMotion(wave);
  const [gap1, gap2] = world.schedule.map((event) => event.gap);

  let step = stepMotion(world, gap1 - 0.01, alive(1));
  assert.deepEqual(step.spawnedIds, []);

  step = stepMotion(step.world, 0.01, alive(1, 2));
  assert.deepEqual(step.spawnedIds, [2]);
  assert.equal(step.world.walking.length, 2);
  close(step.world.walking[1].x, SPAWN_X);
  assert.deepEqual(step.world.queue.map((enemy) => enemy.id), [3, 4]);
  // The next countdown is the schedule's next gap.
  close(step.world.spawnIn, gap2);

  step = stepMotion(step.world, gap2 - 0.01, alive(1, 2, 3));
  assert.deepEqual(step.spawnedIds, []);
  step = stepMotion(step.world, 0.01, alive(1, 2, 3));
  assert.deepEqual(step.spawnedIds, [3]);
});

test("spawns stop once the schedule and queue are exhausted", () => {
  let world = createMotion(wave);
  let step;
  for (let i = 0; i < 10; i += 1) {
    step = stepMotion(world, world.spawnIn + 1, alive(1, 2, 3, 4));
    world = step.world;
    if (world.queue.length === 0) break;
  }
  assert.equal(world.queue.length, 0);
  assert.equal(world.walking.length, wave.length);
  assert.equal(world.schedule.length, 0);

  step = stepMotion(world, 100, alive(1, 2, 3, 4));
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

test("the mirror names the variant of the Enemy closest to the line", () => {
  const world = createMotion([{ variant: "tank" }, { variant: "runner" }]);
  // Spawn the runner by exhausting its gap, then park it behind the tank.
  const spawned = stepMotion(world, world.spawnIn, alive(1, 2)).world;
  spawned.walking[0].x = DANGER_X + 1; // the tank, closest to the line
  spawned.walking[1].x = SPAWN_X;

  assert.equal(nearestVariant(spawned, alive(1, 2)), "tank");
  // The defeated close Enemy no longer threatens; the runner behind it does.
  assert.equal(nearestVariant(spawned, alive(2)), "runner");
  assert.equal(nearestVariant(spawned, alive()), null);
});

test("the level is complete only when the queue is empty and every Enemy is defeated", () => {
  let world = createMotion(wave);
  assert.equal(levelComplete(world, 0), false);

  for (let i = 0; i < 10; i += 1) {
    world = stepMotion(world, world.spawnIn + 1, alive(1, 2, 3, 4)).world;
    if (world.queue.length === 0) break;
  }
  assert.equal(levelComplete(world, wave.length - 1), false);
  assert.equal(levelComplete(world, wave.length), true);
});
