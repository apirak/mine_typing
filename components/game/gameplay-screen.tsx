"use client";

// The gameplay screen for one Level: HUD, 3D battlefield, mission card,
// on-screen keyboard, and the offscreen live mirror. Everything that
// distinguishes Levels — name, trained keys, Word queue, counts — comes
// from the Level data prop; run state comes from the store, which the
// load effect (re)seeds from that same data on every route entry.

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Volume2, VolumeX, X } from "lucide-react";

import { Battlefield } from "@/components/game/battlefield";
import { PauseCard } from "@/components/game/pause-card";
import { isForeignLetterEvent, typedKeyFromEvent } from "@/lib/game/keys";
import { activeEnemies } from "@/lib/game/matching";
import { KEY_FINGERS, type Level } from "@/lib/game/levels";
import { accuracyPercent } from "@/lib/game/storage";
import { readyFeedback, useGameStore } from "@/lib/game/store";

const ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

export function GameplayScreen({ level }: { level: Level }) {
  const router = useRouter();
  const storeLevelId = useGameStore((state) => state.level.id);
  const phase = useGameStore((state) => state.phase);
  const enemies = useGameStore((state) => state.enemies);
  const sequence = useGameStore((state) => state.sequence);
  const hits = useGameStore((state) => state.hits);
  const misses = useGameStore((state) => state.misses);
  const combo = useGameStore((state) => state.combo);
  const paused = useGameStore((state) => state.paused);
  const sound = useGameStore((state) => state.sound);
  const showVirtualKeyboard = useGameStore((state) => state.showVirtualKeyboard);
  const lastKey = useGameStore((state) => state.lastKey);
  const shakeTick = useGameStore((state) => state.shakeTick);
  const typeKey = useGameStore((state) => state.typeKey);
  const resetStore = useGameStore((state) => state.reset);
  const setPaused = useGameStore((state) => state.setPaused);
  const toggleSound = useGameStore((state) => state.toggleSound);

  // Until the store has loaded this route's Level (never on the server),
  // run-state copy shows the fresh-run view of the Level data.
  const isActiveLevel = storeLevelId === level.id;
  const feedback = useGameStore((state) =>
    isActiveLevel ? state.feedback : readyFeedback(level),
  );

  const gameRef = useRef<HTMLDivElement>(null);
  const [shaking, setShaking] = useState(false);
  // Sticky once a non-English letter press arrives; an English keypress
  // clears it, so the note tracks the live input source.
  const [foreignInput, setForeignInput] = useState(false);
  const remaining = activeEnemies(enemies).length;
  const defeatedCount = enemies.length - remaining;
  const accuracy = accuracyPercent(hits, misses);
  const progress = (defeatedCount / level.words.length) * 100;

  const reset = useCallback(() => {
    resetStore();
    gameRef.current?.focus();
  }, [resetStore]);

  // A Level route entry always starts a fresh run of that Level's data.
  useEffect(() => {
    useGameStore.getState().loadLevel(level.id);
  }, [level.id]);

  // The Result route owns the run's outcome (ticket #6): a short beat so
  // the final keypress reads, then the gameplay screen hands off.
  useEffect(() => {
    if (phase !== "level-complete" && phase !== "game-over") return;
    const timer = window.setTimeout(
      () => router.push(`/level/${level.id}/result`),
      450,
    );
    return () => window.clearTimeout(timer);
  }, [phase, level.id, router]);

  // Restore persisted settings and this Level's bests (ticket #5). The
  // server render shows the defaults; the client corrects after load.
  useEffect(() => {
    void useGameStore.getState().hydrate();
  }, []);

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
        // Pausing only interrupts a live run (spec #2: typing/pauses apply
        // while playing).
        if (useGameStore.getState().phase === "playing") {
          setPaused(!useGameStore.getState().paused);
        }
        return;
      }
      // The game reads what the player actually typed, never the pressed
      // key's position: a non-English input source raises a "switch to
      // English" note instead of being reinterpreted (issue #9).
      const key = typedKeyFromEvent(event);
      if (key) {
        setForeignInput(false);
        typeKey(key);
      } else if (isForeignLetterEvent(event)) {
        setForeignInput(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [typeKey, setPaused]);

  return <main className="game-shell">
    <section className={`game-frame ${shaking ? "is-shaking" : ""}`} ref={gameRef} tabIndex={-1} aria-label={`Typing game: ${level.name}`}>
      <header className="hud">
        <button className="icon-button" onClick={() => setPaused(true)} aria-label="Pause game"><X size={22}/></button>
        <div className="level-label"><span>{level.worldLabel}</span><strong>{level.name}</strong></div>
        <div className="progress-wrap" aria-label={`${Math.round(progress)} percent complete`}><span style={{ width: `${progress}%` }} /></div>
        <div className="stat"><span>ACCURACY</span><strong>{accuracy}%</strong></div>
        <div className="stat"><span>COMBO</span><strong className="combo">×{combo}</strong></div>
        <button className="icon-button" onClick={toggleSound} aria-label={sound ? "Mute sound" : "Enable sound"}>{sound ? <Volume2 size={22}/> : <VolumeX size={22}/>}</button>
      </header>
      <Battlefield level={level} />
      <footer className="typing-deck">
        <div className="feedback-row"><div><span className="status-light"/> {feedback}</div><span>{sequence ? <>Sequence <strong>{sequence}</strong></> : "Waiting for a new target"}</span></div>
        {foreignInput && <p className="hint foreign-hint" role="status">Your keyboard isn't typing English — switch your input source to <kbd>EN</kbd> <span lang="th">(คีย์บอร์ดไม่ใช่ภาษาอังกฤษ — สลับภาษาเป็น EN)</span></p>}
        {showVirtualKeyboard && <div className="keyboard" aria-label="On-screen keyboard">{ROWS.map((row,rowIndex)=><div className={`key-row row-${rowIndex}`} key={rowIndex}>{row.map((key)=>{
          const trained = level.trainedKeys.includes(key);
          const classes = [trained && "training-key", lastKey === key && "pressed"].filter(Boolean).join(" ");
          return <button key={key} data-key={key} onClick={()=>typeKey(key)} className={classes || undefined}><span>{key}</span>{trained && <i/>}</button>;
        })}</div>)}</div>}
        <p className="hint">{level.trainedKeys.map((key, index) => <Fragment key={key}><kbd>{key}</kbd> {KEY_FINGERS[key]} {index < level.trainedKeys.length - 1 && <span>•</span>} </Fragment>)}<span>•</span> Press <kbd>Esc</kbd> to pause</p>
      </footer>
      {paused && <div className="overlay" role="dialog" aria-modal="true">
        <PauseCard
          onContinue={()=>{setPaused(false);gameRef.current?.focus();}}
          onRestart={reset}
        />
      </div>}
    </section>
  </main>;
}
