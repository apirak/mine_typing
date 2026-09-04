"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";

import { matchedLetters } from "@/lib/game/matching";
import { LEVEL_ONE_WORDS, useGameStore } from "@/lib/game/store";

import { Scene } from "./scene/scene";
import { useAutoPause } from "./use-auto-pause";

function WebGLFallback() {
  return (
    <div className="webgl-fallback" role="status">
      <strong>3D scene unavailable</strong>
      <p>
        This browser cannot create a WebGL context, so the battlefield cannot
        render. Typing practice still works below — the keyboard, HUD, and
        words stay fully usable.
      </p>
    </div>
  );
}

function WordMirror() {
  const enemies = useGameStore((state) => state.enemies);
  const sequence = useGameStore((state) => state.sequence);
  const phase = useGameStore((state) => state.phase);
  const dangerNear = useGameStore((state) => state.dangerNear);

  // Counts cover the whole Level queue, not just spawned Enemies, so the
  // mission stays readable (and server-renderable) between spawns.
  const defeatedCount = enemies.filter((enemy) => enemy.defeated).length;
  const remaining = LEVEL_ONE_WORDS.length - defeatedCount;
  const byId = new Map(enemies.map((enemy) => [enemy.id, enemy]));

  let summary: string;
  if (phase === "game-over") {
    summary = "Game over. An enemy reached the Danger Line.";
  } else if (remaining === 0) {
    summary = "Wave complete. Every enemy is defeated.";
  } else {
    summary =
      `${remaining} ${remaining === 1 ? "enemy" : "enemies"} remaining. ` +
      LEVEL_ONE_WORDS.map((word, index) => {
        const enemy = byId.get(index + 1);
        if (enemy?.defeated) return null;
        // Queued Enemies read as 0 matched until they spawn.
        const matched = enemy ? matchedLetters(word, sequence) : 0;
        return `Word ${word.split("").join(" ")}: ${matched} of ${word.length} letters matched.`;
      })
        .filter(Boolean)
        .join(" ");
    if (phase === "playing" && dangerNear) {
      summary += " Warning: an enemy is close to the Danger Line.";
    }
  }

  return (
    <div className="visually-hidden" aria-live="polite">
      {summary}
    </div>
  );
}

// The battlefield area of the gameplay screen: a true 3D voxel scene
// (ADR 0001/0002) with the DOM mission card and the offscreen word mirror
// layered on top. HUD and keyboard stay in the page component.
export function Battlefield() {
  const enemies = useGameStore((state) => state.enemies);
  useAutoPause();

  const defeatedCount = enemies.filter((enemy) => enemy.defeated).length;
  const remaining = LEVEL_ONE_WORDS.length - defeatedCount;

  return (
    <div className="battlefield">
      <Canvas
        className="scene-canvas"
        dpr={[1, 2]}
        camera={{ position: [0, 3.4, 17], fov: 27, near: 0.1, far: 200 }}
        onCreated={({ camera }) => camera.lookAt(0, 1.9, 0)}
        gl={{ antialias: true }}
        fallback={<WebGLFallback />}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <div className="mission-card">
        <span className="mission-dot" />
        <div>
          <small>YOUR MISSION</small>
          <strong>
            {remaining === 0
              ? "Wave complete!"
              : `Clear ${remaining} creature${remaining > 1 ? "s" : ""}`}
          </strong>
        </div>
      </div>
      <WordMirror />
    </div>
  );
}
