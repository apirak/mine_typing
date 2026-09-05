// Pure Enemy movement rules: walking, hit-stop, staggered spawns, the
// Danger Line breach, and the win condition. Given a motion world and one
// time step, returns the next world plus events. No React, no DOM, no
// three.js — assertable from node:test like ./matching. The live positions
// themselves stay OUTSIDE React state (the store's gameMotion box): no DOM
// view consumes them, so the store only receives this module's discrete
// events (spawn, breach).

import { DANGER_LANE, laneToWorldX } from "./layout";

/** Default seconds between spawns; the first Enemy walks immediately. */
export const SPAWN_INTERVAL = 5;
/** Spawn edge, just off the framed field's right edge (field spans ±8). */
export const SPAWN_X = 9;
/** Default uniform walk speed in world units per second (plan_a §7). */
export const WALK_SPEED = 0.85;

/** Per-Level overrides; defaults keep the prototype's shared rhythm. */
export type MotionOptions = {
  walkSpeed?: number;
  spawnInterval?: number;
};
/** Seconds a correct key freezes each Enemy it hit (plan_a §4). */
export const HIT_STOP = 0.35;
/** Distance from the Danger Line at which the mirror warns to hurry. */
export const NEAR_MARGIN = 2.5;

export const DANGER_X = laneToWorldX(DANGER_LANE);

export type MotionEnemy = {
  /** Queue position + 1; also the store enemy id. */
  id: number;
  x: number;
  /** Seconds of hit-stop left; the Enemy holds position while it ticks. */
  stun: number;
};

export type MotionWorld = {
  /** Every spawned Enemy in spawn order; defeated ones keep their last x. */
  walking: MotionEnemy[];
  /** Ids of Enemies that have not spawned yet, in spawn order. */
  queue: number[];
  /** Seconds until the next queued Enemy joins the walk. */
  spawnIn: number;
  /** This Level's walk speed in world units per second. */
  walkSpeed: number;
  /** This Level's seconds between spawns. */
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
  words: readonly string[],
  options: MotionOptions = {},
): MotionWorld {
  const [first, ...rest] = words.map((_, index) => index + 1);
  return {
    walking: first === undefined ? [] : [{ id: first, x: SPAWN_X, stun: 0 }],
    queue: rest,
    spawnIn: options.spawnInterval ?? SPAWN_INTERVAL,
    walkSpeed: options.walkSpeed ?? WALK_SPEED,
    spawnInterval: options.spawnInterval ?? SPAWN_INTERVAL,
  };
}

/**
 * Advance the world by dt. Active Enemies walk toward the Player unless
 * hit-stopped; one crossing the Danger Line breaches (the caller ends the
 * run, so repeated reports are harmless); the next queued Enemy joins when
 * the interval elapses. aliveIds carries the matching module's verdicts —
 * defeated Enemies freeze where they died so the burst plays in place.
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
    const x = enemy.x - world.walkSpeed * Math.max(0, dt - enemy.stun);
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
  let spawnIn = world.spawnIn;
  if (!breached) {
    spawnIn -= dt;
    while (spawnIn <= 0 && queue.length > 0) {
      const [id] = queue;
      queue = queue.slice(1);
      spawnedIds.push(id);
      walking.push({ id, x: SPAWN_X, stun: 0 });
      spawnIn += world.spawnInterval;
    }
  }

  return {
    world: {
      walking,
      queue,
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

/** Live world x for a spawned Enemy; undefined once (and before) spawned. */
export function enemyX(world: MotionWorld, id: number): number | undefined {
  return world.walking.find((enemy) => enemy.id === id)?.x;
}
