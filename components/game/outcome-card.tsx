"use client";

// The outcome card inside the gameplay overlay: paused, Game Over, and
// level complete are distinct states of one card (spec #2). Presentational
// by design — every value arrives as a prop, including the Level's stored
// bests (ticket #5) — so the render seam can assert what a player sees
// straight from props, the way the page test does.

import { Play, RotateCcw } from "lucide-react";

import type { GamePhase } from "@/lib/game/store";
import type { LevelBest } from "@/lib/game/storage";

export type OutcomeCardProps = {
  phase: GamePhase;
  paused: boolean;
  /** This run's rounded accuracy percentage. */
  accuracy: number;
  /** This run's correct key count. */
  hits: number;
  /** The Level's best stored accuracy and combo, or null before storage has one. */
  best: LevelBest | null;
  onContinue: () => void;
  onRestart: () => void;
};

export function OutcomeCard({
  phase,
  paused,
  accuracy,
  hits,
  best,
  onContinue,
  onRestart,
}: OutcomeCardProps) {
  return <div className="pause-card">
    <span className="card-kicker">{phase === "game-over" ? "GAME OVER" : phase === "level-complete" ? "NICE WORK" : "GAME PAUSED"}</span>
    <h1>{phase === "game-over" ? "A creature got through" : phase === "level-complete" ? "Level cleared!" : "Take a breath"}</h1>
    <p>{phase === "game-over" ? "It reached the Danger Line. Restart the level to try again." : phase === "level-complete" ? `${accuracy}% accuracy · ${hits} correct keys` : "Your progress is safe. Continue whenever you are ready."}</p>
    {phase === "level-complete" && best !== null && <p>Best: {best.accuracy}% accuracy · ×{best.combo} combo</p>}
    {paused && phase === "playing" && <button className="primary-button" onClick={onContinue}><Play size={18} fill="currentColor"/> Continue</button>}
    <button className="secondary-button" onClick={onRestart}><RotateCcw size={18}/> Restart level</button>
  </div>;
}
