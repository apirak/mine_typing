// Pure Candidate Group matching rules. Given the current enemies and
// progress plus one typed key, returns the next state. No React, no DOM,
// no three.js — assertable from node:test without a browser or GPU.

export type EnemySeed = { id: number; word: string };

export type EnemyState = EnemySeed & { defeated: boolean };

export type GameProgress = {
  /** The Candidate Group's current typed sequence; "" when no group is open. */
  sequence: string;
  hits: number;
  misses: number;
  combo: number;
};

export type KeyEvent = {
  kind: "hit" | "defeat" | "miss";
  /** Every non-defeated enemy whose Word still matches after this key. */
  hitIds: number[];
  /** Enemies whose Word was completed by this key. */
  defeatedIds: number[];
};

export function enemies<T extends EnemySeed>(seeds: readonly T[]): (T & { defeated: boolean })[] {
  return seeds.map((seed) => ({ ...seed, defeated: false }));
}

export function activeEnemies<T extends EnemyState>(enemies: readonly T[]): T[] {
  return enemies.filter((enemy) => !enemy.defeated);
}

export function progress(): GameProgress {
  return { sequence: "", hits: 0, misses: 0, combo: 0 };
}

export function matchedLetters(word: string, sequence: string): number {
  return word.startsWith(sequence) ? sequence.length : 0;
}

/**
 * Apply one key. Returns null for keys outside A-Z so callers can ignore
 * them. A miss resets the group (Words return to white); completing a Word
 * defeats every enemy carrying it — identical Words die together — and
 * clears the group so the next key opens a fresh search.
 */
export function applyKey<T extends EnemyState>(
  currentEnemies: readonly T[],
  currentProgress: GameProgress,
  rawKey: string,
): { enemies: T[]; progress: GameProgress; event: KeyEvent } | null {
  const key = rawKey.toUpperCase();
  if (!/^[A-Z]$/.test(key)) return null;

  const active = currentEnemies.filter((enemy) => !enemy.defeated);
  const nextSequence = currentProgress.sequence + key;
  const matches = active.filter((enemy) => enemy.word.startsWith(nextSequence));

  if (matches.length === 0) {
    return {
      enemies: [...currentEnemies],
      progress: {
        ...currentProgress,
        sequence: "",
        misses: currentProgress.misses + 1,
        combo: 0,
      },
      event: { kind: "miss", hitIds: [], defeatedIds: [] },
    };
  }

  const defeatedIds = matches
    .filter((enemy) => enemy.word === nextSequence)
    .map((enemy) => enemy.id);
  const defeatedSet = new Set(defeatedIds);
  const hitIds = matches.map((enemy) => enemy.id);

  return {
    enemies: currentEnemies.map((enemy) =>
      defeatedSet.has(enemy.id) ? { ...enemy, defeated: true } : enemy,
    ),
    progress: {
      ...currentProgress,
      sequence: defeatedIds.length > 0 ? "" : nextSequence,
      hits: currentProgress.hits + 1,
      combo: currentProgress.combo + 1,
    },
    event: {
      kind: defeatedIds.length > 0 ? "defeat" : "hit",
      hitIds,
      defeatedIds,
    },
  };
}
