// Pure progression rules (plan_a §11, spec #2): the star rating a finished
// run earns, its typing speed, the display line for a star rating, and
// which Levels a saved history unlocks. No React, no DOM, no storage —
// inputs arrive as plain values, so the rules stay assertable from
// node:test.

import { WORLD_ONE } from "./levels";

/** A finished run reduced to what the star rules and CPM read. */
export type RunOutcome = {
  /** Rounded 0–100 accuracy percentage of the run. */
  accuracy: number;
  /** Play time of the run in seconds (pauses excluded). */
  elapsedSeconds: number;
};

/**
 * Stars for one finished run (plan_a §11): finishing earns the first,
 * ≥90% accuracy the second, and ≥95% accuracy within the Level's time
 * target the third. Accuracy outranks speed — fast but sloppy play
 * never passes 90's gate.
 */
export function starsFor(
  run: RunOutcome,
  level: { timeTarget: number },
): 1 | 2 | 3 {
  if (run.accuracy >= 95 && run.elapsedSeconds <= level.timeTarget) return 3;
  if (run.accuracy >= 90) return 2;
  return 1;
}

/**
 * Correct keys per minute of the run. Wrong keys never add speed —
 * accuracy is the score the game optimizes for (plan_a §11) — and a
 * zero-length run reports 0 rather than Infinity.
 */
export function cpm(correctKeys: number, elapsedSeconds: number): number {
  if (elapsedSeconds <= 0) return 0;
  return Math.round(correctKeys / (elapsedSeconds / 60));
}

/** The distinct Level ids a saved result history says are completed. */
export function completedLevelIds(
  results: readonly { levelId: string }[],
): Set<string> {
  return new Set(results.map((result) => result.levelId));
}

/**
 * A Level is playable when it is the World's first or the previous Level
 * has a saved result: completing Level N unlocks N+1, derived from the
 * history instead of a stored flag so progress stays one source of truth.
 */
export function isLevelUnlocked(levelId: string, completed: Set<string>): boolean {
  const index = WORLD_ONE.findIndex((level) => level.id === levelId);
  if (index < 0) return false;
  if (index === 0) return true;
  return completed.has(WORLD_ONE[index - 1].id);
}

/** The Level that follows in the World's order, or null after the last. */
export function nextLevelId(levelId: string): string | null {
  const index = WORLD_ONE.findIndex((level) => level.id === levelId);
  if (index < 0 || index + 1 >= WORLD_ONE.length) return null;
  return WORLD_ONE[index + 1].id;
}

/** A three-glyph display of a star rating, e.g. "★★☆"; out of range reads empty. */
export function starLine(stars: number): string {
  const filled = Math.min(3, Math.max(0, Math.round(stars)));
  return "★".repeat(filled) + "☆".repeat(3 - filled);
}
