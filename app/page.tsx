"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";

import { Battlefield } from "@/components/game/battlefield";
import { activeEnemies } from "@/lib/game/matching";
import { useGameStore } from "@/lib/game/store";

const ROWS = [["Q","W","E","R","T","Y","U","I","O","P"],["A","S","D","F","G","H","J","K","L"],["Z","X","C","V","B","N","M"]];

export default function Home() {
  const enemies = useGameStore((state) => state.enemies);
  const sequence = useGameStore((state) => state.sequence);
  const hits = useGameStore((state) => state.hits);
  const misses = useGameStore((state) => state.misses);
  const combo = useGameStore((state) => state.combo);
  const paused = useGameStore((state) => state.paused);
  const sound = useGameStore((state) => state.sound);
  const feedback = useGameStore((state) => state.feedback);
  const lastKey = useGameStore((state) => state.lastKey);
  const shakeTick = useGameStore((state) => state.shakeTick);
  const typeKey = useGameStore((state) => state.typeKey);
  const resetStore = useGameStore((state) => state.reset);
  const setPaused = useGameStore((state) => state.setPaused);
  const toggleSound = useGameStore((state) => state.toggleSound);

  const gameRef = useRef<HTMLDivElement>(null);
  const [shaking, setShaking] = useState(false);
  const remaining = activeEnemies(enemies).length;
  const accuracy = hits + misses === 0 ? 100 : Math.round((hits / (hits + misses)) * 100);
  const progress = ((enemies.length - remaining) / enemies.length) * 100;

  const reset = useCallback(() => {
    resetStore();
    gameRef.current?.focus();
  }, [resetStore]);

  useEffect(() => {
    if (shakeTick === 0) return;
    // Defer through rAF so the animation class lands after paint and the
    // effect body stays free of synchronous setState.
    const frame = window.requestAnimationFrame(() => setShaking(true));
    const timer = window.setTimeout(() => setShaking(false), 280);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [shakeTick]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPaused(!useGameStore.getState().paused);
        return;
      }
      typeKey(event.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [typeKey, setPaused]);

  return <main className="game-shell">
    <section className={`game-frame ${shaking ? "is-shaking" : ""}`} ref={gameRef} tabIndex={-1} aria-label="Typing game prototype">
      <header className="hud">
        <button className="icon-button" onClick={() => setPaused(true)} aria-label="Pause game"><X size={22}/></button>
        <div className="level-label"><span>HOME ROW</span><strong>Level 1 · F + J</strong></div>
        <div className="progress-wrap" aria-label={`${Math.round(progress)} percent complete`}><span style={{ width: `${progress}%` }} /></div>
        <div className="stat"><span>ACCURACY</span><strong>{accuracy}%</strong></div>
        <div className="stat"><span>COMBO</span><strong className="combo">×{combo}</strong></div>
        <button className="icon-button" onClick={toggleSound} aria-label={sound ? "Mute sound" : "Enable sound"}>{sound ? <Volume2 size={22}/> : <VolumeX size={22}/>}</button>
      </header>
      <Battlefield />
      <footer className="typing-deck">
        <div className="feedback-row"><div><span className="status-light"/> {feedback}</div><span>{sequence ? <>Sequence <strong>{sequence}</strong></> : "Waiting for a new target"}</span></div>
        <div className="keyboard" aria-label="On-screen keyboard">{ROWS.map((row,rowIndex)=><div className={`key-row row-${rowIndex}`} key={rowIndex}>{row.map((key)=><button key={key} onClick={()=>typeKey(key)} className={`${key === "F" || key === "J" ? "training-key" : ""} ${lastKey === key ? "pressed" : ""}`}><span>{key}</span>{(key === "F" || key === "J") && <i/>}</button>)}</div>)}</div>
        <p className="hint"><kbd>F</kbd> Left index finger <span>•</span> <kbd>J</kbd> Right index finger <span>•</span> Press <kbd>Esc</kbd> to pause</p>
      </footer>
      {(paused || remaining === 0) && <div className="overlay" role="dialog" aria-modal="true"><div className="pause-card"><span className="card-kicker">{remaining === 0 ? "NICE WORK" : "GAME PAUSED"}</span><h1>{remaining === 0 ? "Wave cleared!" : "Take a breath"}</h1><p>{remaining === 0 ? `${accuracy}% accuracy · ${hits} correct keys` : "Your progress is safe. Continue whenever you are ready."}</p>{remaining > 0 && <button className="primary-button" onClick={()=>{setPaused(false);gameRef.current?.focus();}}><Play size={18} fill="currentColor"/> Continue</button>}<button className="secondary-button" onClick={reset}><RotateCcw size={18}/> Restart level</button></div></div>}
    </section>
  </main>;
}
