"use client";

// The pause card inside the gameplay overlay (spec #2). The run's outcome
// moved to the Result screen (ticket #6) — this card only interrupts a
// live run. Presentational by design: every action arrives as a prop, the
// way the page test asserts.

import { Play, RotateCcw } from "lucide-react";

export type PauseCardProps = {
  onContinue: () => void;
  onRestart: () => void;
};

export function PauseCard({ onContinue, onRestart }: PauseCardProps) {
  return <div className="pause-card">
    <span className="card-kicker">GAME PAUSED</span>
    <h1>Take a breath</h1>
    <p>Your progress is safe. Continue whenever you are ready.</p>
    <button className="primary-button" onClick={onContinue}><Play size={18} fill="currentColor"/> Continue</button>
    <button className="secondary-button" onClick={onRestart}><RotateCcw size={18}/> Restart level</button>
  </div>;
}
