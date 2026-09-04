"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";

type Enemy = { id: number; word: string; x: number; defeated: boolean; pulse: number };
const STARTING_ENEMIES: Enemy[] = [
  { id: 1, word: "F", x: 34, defeated: false, pulse: 0 },
  { id: 2, word: "FJ", x: 50, defeated: false, pulse: 0 },
  { id: 3, word: "J", x: 67, defeated: false, pulse: 0 },
  { id: 4, word: "JF", x: 82, defeated: false, pulse: 0 },
];
const ROWS = [["Q","W","E","R","T","Y","U","I","O","P"],["A","S","D","F","G","H","J","K","L"],["Z","X","C","V","B","N","M"]];

export default function Home() {
  const [enemies, setEnemies] = useState(STARTING_ENEMIES);
  const [typed, setTyped] = useState("");
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState("Type F or J to attack");
  const [lastKey, setLastKey] = useState("");
  const [shake, setShake] = useState(false);
  const gameRef = useRef<HTMLDivElement>(null);
  const remaining = enemies.filter((enemy) => !enemy.defeated).length;
  const accuracy = hits + misses === 0 ? 100 : Math.round((hits / (hits + misses)) * 100);
  const progress = ((STARTING_ENEMIES.length - remaining) / STARTING_ENEMIES.length) * 100;

  const reset = useCallback(() => {
    setEnemies(STARTING_ENEMIES.map((enemy) => ({ ...enemy })));
    setTyped(""); setHits(0); setMisses(0); setCombo(0); setLastKey("");
    setFeedback("Type F or J to attack"); setPaused(false);
    gameRef.current?.focus();
  }, []);

  const typeKey = useCallback((rawKey: string) => {
    if (paused || remaining === 0) return;
    const key = rawKey.toUpperCase();
    if (!/^[A-Z]$/.test(key)) return;
    setLastKey(key);
    const active = enemies.filter((enemy) => !enemy.defeated);
    const nextSequence = typed + key;
    const matches = active.filter((enemy) => enemy.word.startsWith(nextSequence));
    if (matches.length === 0) {
      setMisses((value) => value + 1); setCombo(0); setTyped("");
      setFeedback(`${key} missed — start again`); setShake(true);
      window.setTimeout(() => setShake(false), 260);
      return;
    }
    setHits((value) => value + 1); setCombo((value) => value + 1);
    const defeatedIds = new Set(matches.filter((enemy) => enemy.word === nextSequence).map((enemy) => enemy.id));
    setEnemies((current) => current.map((enemy) => {
      if (defeatedIds.has(enemy.id)) return { ...enemy, defeated: true, pulse: enemy.pulse + 1 };
      if (enemy.word.startsWith(nextSequence)) return { ...enemy, pulse: enemy.pulse + 1 };
      return enemy;
    }));
    const after = remaining - defeatedIds.size;

    // A completed enemy ends the current sequence. Every surviving enemy
    // returns to white and the next key begins a fresh target search.
    if (defeatedIds.size > 0) {
      setTyped("");
      setFeedback(after === 0 ? "Wave cleared!" : `${defeatedIds.size} creature cleared — new target`);
    } else {
      setTyped(nextSequence);
      setFeedback(`${matches.length} target${matches.length > 1 ? "s" : ""} matched`);
    }
  }, [enemies, paused, remaining, typed]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setPaused((value) => !value); return; }
      typeKey(event.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [typeKey]);

  const candidates = useMemo(() => new Set(enemies.filter((enemy) => !enemy.defeated && typed && enemy.word.startsWith(typed)).map((enemy) => enemy.id)), [enemies, typed]);

  return <main className="game-shell">
    <section className={`game-frame ${shake ? "is-shaking" : ""}`} ref={gameRef} tabIndex={-1} aria-label="Typing game prototype">
      <header className="hud">
        <button className="icon-button" onClick={() => setPaused(true)} aria-label="Pause game"><X size={22}/></button>
        <div className="level-label"><span>HOME ROW</span><strong>Level 1 · F + J</strong></div>
        <div className="progress-wrap" aria-label={`${Math.round(progress)} percent complete`}><span style={{ width: `${progress}%` }} /></div>
        <div className="stat"><span>ACCURACY</span><strong>{accuracy}%</strong></div>
        <div className="stat"><span>COMBO</span><strong className="combo">×{combo}</strong></div>
        <button className="icon-button" onClick={() => setSound((value) => !value)} aria-label={sound ? "Mute sound" : "Enable sound"}>{sound ? <Volume2 size={22}/> : <VolumeX size={22}/>}</button>
      </header>
      <div className="battlefield">
        <div className="sky-vignette" /><div className="danger-line"><span>DANGER</span></div>
        {enemies.map((enemy) => <div key={enemy.id} className={`enemy-marker ${enemy.defeated ? "is-defeated" : ""} ${candidates.has(enemy.id) ? "is-candidate" : ""}`} style={{ left: `${enemy.x}%` }}>
          <div className="word-bubble" aria-label={enemy.word}>{enemy.word.split("").map((letter,index)=><span key={index} className={index < typed.length && candidates.has(enemy.id) ? "matched" : ""}>{letter}</span>)}</div>
          <div key={enemy.pulse} className={enemy.pulse ? "hit-burst" : ""}>{enemy.defeated ? "✦" : ""}</div>
        </div>)}
        <div className="mission-card"><span className="mission-dot"/><div><small>YOUR MISSION</small><strong>{remaining === 0 ? "Wave complete!" : `Clear ${remaining} creature${remaining > 1 ? "s" : ""}`}</strong></div></div>
      </div>
      <footer className="typing-deck">
        <div className="feedback-row"><div><span className="status-light"/> {feedback}</div><span>{typed ? <>Sequence <strong>{typed}</strong></> : "Waiting for a new target"}</span></div>
        <div className="keyboard" aria-label="On-screen keyboard">{ROWS.map((row,rowIndex)=><div className={`key-row row-${rowIndex}`} key={rowIndex}>{row.map((key)=><button key={key} onClick={()=>typeKey(key)} className={`${key === "F" || key === "J" ? "training-key" : ""} ${lastKey === key ? "pressed" : ""}`}><span>{key}</span>{(key === "F" || key === "J") && <i/>}</button>)}</div>)}</div>
        <p className="hint"><kbd>F</kbd> Left index finger <span>•</span> <kbd>J</kbd> Right index finger <span>•</span> Press <kbd>Esc</kbd> to pause</p>
      </footer>
      {(paused || remaining === 0) && <div className="overlay" role="dialog" aria-modal="true"><div className="pause-card"><span className="card-kicker">{remaining === 0 ? "NICE WORK" : "GAME PAUSED"}</span><h1>{remaining === 0 ? "Wave cleared!" : "Take a breath"}</h1><p>{remaining === 0 ? `${accuracy}% accuracy · ${hits} correct keys` : "Your progress is safe. Continue whenever you are ready."}</p>{remaining > 0 && <button className="primary-button" onClick={()=>{setPaused(false);gameRef.current?.focus();}}><Play size={18} fill="currentColor"/> Continue</button>}<button className="secondary-button" onClick={reset}><RotateCcw size={18}/> Restart level</button></div></div>}
    </section>
  </main>;
}
