"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";

import { activeEnemies, matchedLetters } from "@/lib/game/matching";
import { useGameStore } from "@/lib/game/store";

import { Scene } from "./scene/scene";

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

  const remaining = activeEnemies(enemies);
  const summary =
    remaining.length === 0
      ? "Wave complete. Every enemy is defeated."
      : `${remaining.length} ${remaining.length === 1 ? "enemy" : "enemies"} remaining. ` +
        remaining
          .map((enemy) => {
            const matched = matchedLetters(enemy.word, sequence);
            return `Word ${enemy.word.split("").join(" ")}: ${matched} of ${enemy.word.length} letters matched.`;
          })
          .join(" ");

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
  const remaining = activeEnemies(useGameStore((state) => state.enemies)).length;

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
