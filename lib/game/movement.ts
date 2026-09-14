// Pure Enemy movement rules: walking with per-Enemy speed variants, hit-stop,
// the seeded random spawn schedule, the Danger Line breach, and the win
// condition. Given a motion world and one time step, returns the next world
// plus events. No React, no DOM, no three.js — assertable from node:test like
// ./matching. The randomness stays out of the pure step: createMotion
// precomputes the whole schedule from a seed, and stepMotion only consumes it.
// The live positions themselves stay OUTSIDE React state (the store's
// gameMotion box): no DOM view consumes them, so the store only receives this
// module's discrete events (spawn, breach).

import type { EnemyVariant } from "./levels";
import { DANGER_LANE, laneToWorldX } from "./layout";
import { seededRandom } from "./random";

/** Default base seconds between spawn events; the first Enemy walks immediately. */
export const SPAWN_INTERVAL = 5;
/** Spawn edge, just off the framed field's right edge (field spans ±8). */
export const SPAWN_X = 9;
/** Default base walk speed in world units per second (plan_a §7). */
export const WALK_SPEED = 0.85;
/** Seconds a correct key freezes each Enemy it hit (plan_a §4). */
export const HIT_STOP = 0.35;
/** Distance from the Danger Line at which the mirror warns to hurry. */
export const NEAR_MARGIN = 2.5;

export const DANGER_X = laneToWorldX(DANGER_LANE);

/** Speed multipliers of the Enemy variants (plan/level.md §2.1). */
export const RUNNER_FACTOR = 1.3;
export const TANK_FACTOR = 0.75;

/** Spawn gaps jitter uniformly inside [JITTER_MIN, JITTER_MAX] × base (plan/level.md §2.2). */
export const JITTER_MIN = 0.6;
export const JITTER_MAX = 1.4;

/** Per-Level overrides; defaults keep the prototype's shared rhythm. */
export type MotionOptions = {
  walkSpeed?: number;
  spawnInterval?: number;
  /** Seed for the deterministic schedule; the same seed yields the same gaps. */
  seed?: number;
  /** Probability that one spawn event releases two Enemies at once. */
  pairChance?: number;
};

export type MotionEnemy = {
  /** Queue position + 1; also the store enemy id. */
  id: number;
  x: number;
  /** Seconds of hit-stop left; the Enemy holds position while it ticks. */
  stun: number;
  /** Speed variant resolved from the Level data; walkers move at base speed. */
  variant: EnemyVariant;
};

/** One scheduled spawn moment: a gap after the previous event, and its size. */
export type SpawnEvent = {
  gap: number;
  count: 1 | 2;
};

export type MotionWorld = {
  /** Every spawned Enemy in spawn order; defeated ones keep their last x. */
  walking: MotionEnemy[];
  /** Enemies that have not spawned yet, in spawn order. */
  queue: MotionEnemy[];
  /** Planned spawn events; the head fires once the countdown reaches its gap. */
  schedule: readonly SpawnEvent[];
  /** Seconds until the schedule's head fires. */
  spawnIn: number;
  /** This Level's base walk speed in world units per second. */
  walkSpeed: number;
  /** This Level's base seconds between spawn events. */
  spawnInterval: number;
};

export type MotionStep = {
  world: MotionWorld;
  /** Enemies that joined the walk during this step, in spawn order. */
  spawnedIds: number[];
  /** True when an active Enemy reached the Danger Line during this step. */
  breached: boolean;
};

export function createMotion(
  entries: readonly { variant?: EnemyVariant }[],
  options: MotionOptions = {},
): MotionWorld {
  const walkSpeed = options.walkSpeed ?? WALK_SPEED;
  const spawnInterval = options.spawnInterval ?? SPAWN_INTERVAL;
  const rng = seededRandom(options.seed ?? 0);

  // The whole schedule is decided up front (spec #15): jittered gaps, and a
  // pair roll per event that releases two Enemies into one gap.
  const schedule: SpawnEvent[] = [];
  let pending = entries.length - 1; // the first Enemy walks immediately
  while (pending > 0) {
    const gap = spawnInterval * (JITTER_MIN + (JITTER_MAX - JITTER_MIN) * rng());
    const pair = pending >= 2 && rng() < (options.pairChance ?? 0);
    const count = pair ? 2 : 1;
    schedule.push({ gap, count });
    pending -= count;
  }

  const queue = entries.map((entry, index) => ({
    id: index + 1,
    x: SPAWN_X,
    stun: 0,
    variant: entry.variant ?? "walker",
  }));
  const [first, ...rest] = queue;
  return {
    walking: first === undefined ? [] : [first],
    queue: rest,
    schedule,
    spawnIn: schedule[0]?.gap ?? 0,
    walkSpeed,
    spawnInterval,
  };
}

/** The Enemy's effective walk speed: its variant's factor of the Level base. */
function speedOf(world: MotionWorld, variant: EnemyVariant): number {
  if (variant === "runner") return world.walkSpeed * RUNNER_FACTOR;
  if (variant === "tank") return world.walkSpeed * TANK_FACTOR;
  return world.walkSpeed;
}

/**
 * Advance the world by dt. Active Enemies walk toward the Player at their
 * variant's speed unless hit-stopped; one crossing the Danger Line breaches
 * (the caller ends the run, so repeated reports are harmless); scheduled
 * spawn events release their Enemies when the countdown expires. aliveIds
 * carries the matching module's verdicts — defeated Enemies freeze where they
 * died so the burst plays in place.
 */
export function stepMotion(
  world: MotionWorld,
  dt: number,
  aliveIds: ReadonlySet<number>,
): MotionStep {
  let breached = false;

  const walked = world.walking.map((enemy) => {
    if (!aliveIds.has(enemy.id)) return enemy;
    const stun = Math.max(0, enemy.stun - dt);
    // Only the fraction of the step left after the hit-stop expires moves.
    const x = enemy.x - speedOf(world, enemy.variant) * Math.max(0, dt - enemy.stun);
    return { ...enemy, stun, x };
  });

  // Clamp the breaching Enemy onto the line so the freeze frame lands there.
  const walking = walked.map((enemy) => {
    if (!aliveIds.has(enemy.id) || enemy.x > DANGER_X) return enemy;
    breached = true;
    return { ...enemy, x: DANGER_X };
  });

  const spawnedIds: number[] = [];
  let queue = world.queue;
  let schedule = world.schedule;
  let spawnIn = world.spawnIn;
  if (!breached) {
    spawnIn -= dt;
    while (spawnIn <= 0 && schedule.length > 0 && queue.length > 0) {
      const event = schedule[0];
      for (let i = 0; i < event.count && queue.length > 0; i += 1) {
        const [enemy] = queue;
        queue = queue.slice(1);
        spawnedIds.push(enemy.id);
        walking.push({ ...enemy, x: SPAWN_X, stun: 0 });
      }
      schedule = schedule.slice(1);
      spawnIn += schedule[0]?.gap ?? 0;
    }
  }

  return {
    world: {
      walking,
      queue,
      schedule,
      spawnIn: Math.max(spawnIn, 0),
      walkSpeed: world.walkSpeed,
      spawnInterval: world.spawnInterval,
    },
    spawnedIds,
    breached,
  };
}

/** Apply the hit-stop that a correct key deals to every Enemy it hit. */
export function stunMotion(world: MotionWorld, ids: readonly number[]): MotionWorld {
  const hit = new Set(ids);
  return {
    ...world,
    walking: world.walking.map((enemy) =>
      hit.has(enemy.id) ? { ...enemy, stun: HIT_STOP } : enemy,
    ),
  };
}

/** True once every Enemy has spawned and been defeated (the win condition). */
export function levelComplete(world: MotionWorld, defeatedCount: number): boolean {
  return world.queue.length === 0 && defeatedCount >= world.walking.length;
}

/** Whether any active Enemy is close enough to the line to warn about. */
export function nearDanger(world: MotionWorld, aliveIds: ReadonlySet<number>): boolean {
  const threshold = DANGER_X + NEAR_MARGIN;
  return world.walking.some((enemy) => aliveIds.has(enemy.id) && enemy.x <= threshold);
}

/** Variant of the active Enemy closest to the Danger Line, or null. */
export function nearestVariant(
  world: MotionWorld,
  aliveIds: ReadonlySet<number>,
): EnemyVariant | null {
  let closest: MotionEnemy | undefined;
  for (const enemy of world.walking) {
    if (!aliveIds.has(enemy.id)) continue;
    if (!closest || enemy.x < closest.x) closest = enemy;
  }
  return closest?.variant ?? null;
}

/** Live world x for a spawned Enemy; undefined once (and before) spawned. */
export function enemyX(world: MotionWorld, id: number): number | undefined {
  return world.walking.find((enemy) => enemy.id === id)?.x;
}
