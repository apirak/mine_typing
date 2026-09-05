"use client";

// The Result route's client half (plan_a §10): reads the finished run from
// the store — the same state the gameplay screen left behind — turns it
// into stars and CPM with the pure rules, and carries the keyboard side
// (R retry, L level select, Enter next, Esc back). A direct visit without
// a finished run shows the way out instead of fake numbers.

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Map } from "lucide-react";

import { ResultCard } from "./result-card";
import { typedKeyFromEvent } from "@/lib/game/keys";
import { nextLevelId, starsFor } from "@/lib/game/progression";
import type { Level } from "@/lib/game/levels";
import { accuracyPercent } from "@/lib/game/storage";
import { useGameStore } from "@/lib/game/store";

export function ResultScreen({ level }: { level: Level }) {
  const router = useRouter();
  const phase = useGameStore((state) => state.phase);
  const storeLevelId = useGameStore((state) => state.level.id);
  const hits = useGameStore((state) => state.hits);
  const misses = useGameStore((state) => state.misses);
  const bestCombo = useGameStore((state) => state.bestCombo);
  const elapsedSeconds = useGameStore((state) => state.elapsedSeconds);
  const levelBest = useGameStore((state) => state.levelBest);

  // The run's bests were refreshed by the save; a direct visit hydrates
  // for itself (best-effort, defaults stay on failure).
  useEffect(() => {
    void useGameStore.getState().hydrate();
  }, []);

  const hasRun = phase !== "playing" && storeLevelId === level.id;
  const accuracy = accuracyPercent(hits, misses);
  const stars = hasRun && phase === "level-complete"
    ? starsFor({ accuracy, elapsedSeconds }, level)
    : 0;
  const next = nextLevelId(level.id);

  const retry = () => router.push(`/level/${level.id}`);
  const select = () => router.push("/levels");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" && phase === "level-complete" && next) {
        router.push(`/level/${next}`);
      } else if (event.key === "Escape") {
        select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, phase, next]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = typedKeyFromEvent(event);
      if (key === "R") retry();
      if (key === "L") select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, level.id]);

  return <main className="game-shell">
    <section className="menu-frame" aria-label={`Result: ${level.name}`}>
      {hasRun ? <ResultCard
        level={level}
        defeated={phase === "game-over"}
        stats={{ accuracy, hits, misses, bestCombo, elapsedSeconds }}
        stars={stars}
        hasNext={next !== null}
        onRetry={retry}
        onSelect={select}
        onNext={() => next && router.push(`/level/${next}`)}
      /> : <div className="pause-card">
        <span className="card-kicker">NO RUN YET</span>
        <h1>Nothing to report</h1>
        <p>Play {level.name} first — its result lands here when the level ends.</p>
        <button className="primary-button" onClick={select}><Map size={18}/> LEVEL SELECT</button>
      </div>}
    </section>
  </main>;
}
