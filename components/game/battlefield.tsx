"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";

import { matchedLetters } from "@/lib/game/matching";
import { levelWords, type Level } from "@/lib/game/levels";
import { useGameStore } from "@/lib/game/store";

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

function WordMirror({ level }: { level: Level }) {
  const enemies = useGameStore((state) => state.enemies);
  const sequence = useGameStore((state) => state.sequence);
  const phase = useGameStore((state) => state.phase);
  const dangerNear = useGameStore((state) => state.dangerNear);
  const dangerVariant = useGameStore((state) => state.dangerVariant);

  // Counts cover the whole Level queue, not just spawned Enemies, so the
  // mission stays readable (and server-renderable) between spawns. The
  // Words come from the Level data prop, so the mirror is correct for the
  // route even before the store has loaded the Level client-side.
  const words = levelWords(level);
  const defeatedCount = enemies.filter((enemy) => enemy.defeated).length;
  const remaining = words.length - defeatedCount;
  const byId = new Map(enemies.map((enemy) => [enemy.id, enemy]));

  let summary: string;
  if (phase === "game-over") {
    summary = "Game over. An enemy reached the Danger Line.";
  } else if (remaining === 0) {
    summary = "Level complete. Every enemy is defeated.";
  } else {
    summary =
      `${remaining} ${remaining === 1 ? "enemy" : "enemies"} remaining. ` +
      words
        .map((word, index) => {
          const enemy = byId.get(index + 1);
          if (enemy?.defeated) return null;
          // Queued Enemies read as 0 matched until they spawn.
          const matched = enemy ? matchedLetters(word, sequence) : 0;
          return `Word ${word.split("").join(" ")}: ${matched} of ${word.length} letter${word.length === 1 ? "" : "s"} matched.`;
        })
        .filter(Boolean)
        .join(" ");
    if (phase === "playing" && dangerNear) {
      // The threat's speed variant names the urgency the sighted player sees.
      const threat =
        dangerVariant === "runner" ? "a fast enemy"
        : dangerVariant === "tank" ? "a heavy enemy"
        : "an enemy";
      summary += ` Warning: ${threat} is close to the Danger Line.`;
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
// layered on top. HUD and keyboard stay in the screen component.
export function Battlefield({ level }: { level: Level }) {
  const enemies = useGameStore((state) => state.enemies);
  useAutoPause();

  const defeatedCount = enemies.filter((enemy) => enemy.defeated).length;
  const remaining = level.entries.length - defeatedCount;

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
              ? "Level complete!"
              : `Clear ${remaining} creature${remaining > 1 ? "s" : ""}`}
          </strong>
        </div>
      </div>
      <WordMirror level={level} />
    </div>
  );
}
