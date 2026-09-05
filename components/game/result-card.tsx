// The Result card (plan_a §10): the run's numbers, its star rating, and
// the way back into the loop — all from props, so the render seam asserts
// a win, a defeat, and any provided profile without a browser.

import { RotateCcw, Map, ChevronRight } from "lucide-react";

import type { Level } from "@/lib/game/levels";
import { cpm, starLine } from "@/lib/game/progression";

export type RunStats = {
  accuracy: number;
  hits: number;
  misses: number;
  bestCombo: number;
  elapsedSeconds: number;
};

export type ResultCardProps = {
  level: Level;
  /** True on Game Over: the defeat variant retries instead of advancing. */
  defeated: boolean;
  stats: RunStats;
  /** Stars the run earned, 0 on a defeat (plan_a §11 rules). */
  stars: number;
  /** False on the World's last Level, which has no Next. */
  hasNext: boolean;
  onRetry: () => void;
  onSelect: () => void;
  onNext: () => void;
};

export function ResultCard({
  level,
  defeated,
  stats,
  stars,
  hasNext,
  onRetry,
  onSelect,
  onNext,
}: ResultCardProps) {
  return <div className="pause-card result-card">
    <span className="card-kicker">{defeated ? "GAME OVER" : "LEVEL COMPLETE"}</span>
    <h1>{defeated ? "A creature got through" : level.name}</h1>
    <p className="result-stars" aria-label={`${stars} of 3 stars`}>
      {defeated ? "☆☆☆" : starLine(stars)}
    </p>
    <p>
      {defeated
        ? "It reached the Danger Line. Retry the level, or pick another one."
        : `${stats.accuracy}% accuracy${stars >= 3 ? " — a flawless run!" : stars >= 2 ? " — sharp typing!" : " — clear it again for more stars"}`}
    </p>
    <dl className="result-stats">
      <div><dt>Accuracy</dt><dd>{stats.accuracy}%</dd></div>
      <div><dt>Correct keys</dt><dd>{stats.hits}</dd></div>
      <div><dt>Mistyped keys</dt><dd>{stats.misses}</dd></div>
      <div><dt>Speed</dt><dd>{cpm(stats.hits, stats.elapsedSeconds)} CPM</dd></div>
      <div><dt>Best combo</dt><dd>×{stats.bestCombo}</dd></div>
    </dl>
    <div className="result-actions">
      <button className="secondary-button" onClick={onRetry}><RotateCcw size={18}/> RETRY <kbd>R</kbd></button>
      <button className="secondary-button" onClick={onSelect}><Map size={18}/> LEVEL SELECT <kbd>L</kbd></button>
      {hasNext && !defeated && <button className="primary-button" onClick={onNext}><ChevronRight size={18}/> NEXT <kbd>Enter</kbd></button>}
    </div>
  </div>;
}
