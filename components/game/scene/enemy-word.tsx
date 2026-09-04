"use client";

import { Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";

import { matchedLetters } from "@/lib/game/matching";
import { useReducedMotion } from "../use-reduced-motion";

// OFL-licensed rounded game font (Fredoka), bundled so letters are never
// confusable at typing speed (plan_a §15).
export const GAME_FONT_URL = "/fonts/Fredoka-Variable.ttf";

const MATCHED_COLOR = "#ff5148";
const WORD_COLOR = "#ffffff";
const LETTER_ADVANCE = 0.46;
const FONT_SIZE = 0.62;

type EnemyWordProps = {
  word: string;
  sequence: string;
  baseY: number;
  phase: number;
};

// One troika Text mesh per letter so Matched Letters can turn red
// individually (ADR 0003). The camera is permanently fixed (ADR 0001), so
// billboarding is a one-time tilt toward it rather than a per-frame lookAt.
export function EnemyWord({ word, sequence, baseY, phase }: EnemyWordProps) {
  const groupRef = useRef<Group>(null);
  const camera = useThree((state) => state.camera);
  const reducedMotion = useReducedMotion();
  const matched = matchedLetters(word, sequence);

  const tilt = useMemo(() => {
    const dy = camera.position.y - baseY;
    const dz = camera.position.z;
    return Math.atan2(dy, dz);
  }, [camera, baseY]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.position.y = reducedMotion
      ? baseY
      : baseY + Math.sin(t * 1.5 + phase) * 0.07;
  });

  return (
    <group ref={groupRef}>
      <group rotation={[-tilt, 0, 0]}>
        <mesh position={[0, -0.02, -0.01]}>
          <boxGeometry args={[word.length * LETTER_ADVANCE + 0.34, FONT_SIZE + 0.42, 0.04]} />
          <meshLambertMaterial color="#06101b" transparent opacity={0.82} />
        </mesh>
        {word.split("").map((letter, index) => (
          <Text
            key={`${index}-${letter}`}
            position={[(index - (word.length - 1) / 2) * LETTER_ADVANCE, 0, 0.02]}
            font={GAME_FONT_URL}
            fontSize={FONT_SIZE}
            anchorX="center"
            anchorY="middle"
            color={index < matched ? MATCHED_COLOR : WORD_COLOR}
            letterSpacing={0}
          >
            {letter}
          </Text>
        ))}
      </group>
    </group>
  );
}
