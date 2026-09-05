// The Level Select grid (plan_a §10): one card per Level showing its
// trained keys, star rating, and locked/available/completed state, all
// derived from the `progress` prop — the storage read happens in the
// client wrapper, so the server render can assert any provided profile.

import { isLevelUnlocked } from "@/lib/game/progression";
import type { Level } from "@/lib/game/levels";
import type { LevelBest } from "@/lib/game/storage";

export type LevelProgress = {
  best: LevelBest | null;
  /** Best star rating across the Level's runs, 1–3; null when never played. */
  stars: number | null;
};

/** The Level ids a progress map says are completed (they carry a best). */
export const completedIdsFromProgress = (
  progress: Record<string, LevelProgress>,
): Set<string> =>
  new Set(Object.keys(progress).filter((id) => progress[id].best !== null));

export type LevelSelectProps = {
  levels: readonly Level[];
  /** Saved facts keyed by Level id; a missing entry means never played. */
  progress: Record<string, LevelProgress>;
  /** The Level the keyboard selection rests on (client-side only). */
  selectedId?: string | null;
  onPlay?: (levelId: string) => void;
};

const cardState = (
  unlocked: boolean,
  best: LevelBest | null,
): "completed" | "available" | "locked" =>
  best !== null ? "completed" : unlocked ? "available" : "locked";

const starLine = (stars: number | null): string =>
  "★".repeat(stars ?? 0) + "☆".repeat(3 - (stars ?? 0));

export function LevelSelect({ levels, progress, selectedId, onPlay }: LevelSelectProps) {
  const completed = completedIdsFromProgress(progress);

  return <main className="game-shell">
    <section className="menu-frame" aria-label="Level Select">
      <header className="menu-head">
        <small>ZOMBIE WORLD</small>
        <h1>Choose your Level</h1>
      </header>
      <ol className="level-grid">
        {levels.map((level) => {
          const entry = progress[level.id] ?? { best: null, stars: null };
          const unlocked = isLevelUnlocked(level.id, completed);
          const state = cardState(unlocked, entry.best);
          return <li key={level.id}>
            <button
              className={`level-card ${state} ${selectedId === level.id ? "is-selected" : ""}`}
              data-level-id={level.id}
              aria-disabled={!unlocked}
              onClick={unlocked ? () => onPlay?.(level.id) : undefined}
            >
              <span className="level-stars" aria-label={entry.stars !== null ? `${entry.stars} of 3 stars` : "No stars yet"}>{starLine(entry.stars)}</span>
              <strong className="level-keys">{level.trainedKeys.join(" + ")}</strong>
              <span className="level-name">{level.name}</span>
              <span className="level-state">
                {state === "completed"
                  ? `Accuracy ${entry.best?.accuracy}%`
                  : state === "locked"
                    ? "Locked"
                    : "Ready to play"}
              </span>
            </button>
          </li>;
        })}
      </ol>
      <p className="menu-hint">Arrow keys choose · Enter plays · Esc goes back</p>
    </section>
  </main>;
}
