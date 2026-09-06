"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group } from "three";

import { laneToWorldX, PLAYER_LANE } from "@/lib/game/layout";
import { useGameStore } from "@/lib/game/store";

import { useReducedMotion } from "../use-reduced-motion";

// The Player: an original voxel figure at the far left. Idle breathing
// while thinking; every correct key swings the tool (story 3/4). The run's
// end reads on the Player too (story 21): a jump with both arms raised on
// level complete, a slump toward the Danger Line on game over — toned way
// down under reduced motion.
export function VoxelPlayer() {
  const attackTick = useGameStore((state) => state.attackTick);
  const phase = useGameStore((state) => state.phase);
  const reducedMotion = useReducedMotion();

  const rootRef = useRef<Group>(null);
  const torsoRef = useRef<Group>(null);
  const leftArmRef = useRef<Group>(null);
  const rightArmRef = useRef<Group>(null);
  const swingT = useRef(1);
  const lastAttackTick = useRef(attackTick);
  // Reaction clock: 0 when the phase leaves "playing", 1 once settled.
  // Reset inside the frame loop (not an effect) so the reaction starts on
  // the very first frame that sees the new phase.
  const reactionT = useRef(1);
  const lastPhase = useRef(phase);

  useEffect(() => {
    if (attackTick !== lastAttackTick.current) {
      lastAttackTick.current = attackTick;
      swingT.current = 0;
    }
  }, [attackTick]);

  useFrame(({ clock }, delta) => {
    const root = rootRef.current;
    const torso = torsoRef.current;
    const rightArm = rightArmRef.current;
    const leftArm = leftArmRef.current;
    if (!root || !torso || !rightArm || !leftArm) return;
    if (phase !== lastPhase.current) {
      lastPhase.current = phase;
      reactionT.current = 0;
    }
    const t = clock.getElapsedTime();

    // Idle breathing, toned down (or off) under reduced motion.
    const breath = reducedMotion ? 0 : Math.sin(t * 1.9) * 0.012;
    torso.scale.y = 1 + breath;
    leftArm.rotation.x = reducedMotion ? 0 : Math.sin(t * 1.9 + 0.6) * 0.06;

    if (phase === "level-complete") {
      // Victory: both arms thrown up and waving, jumps fading out over a
      // second — the handoff to Result waits that long for it.
      const p = (reactionT.current = Math.min(1, reactionT.current + delta));
      const up = p * (reducedMotion ? 1.5 : 2.35 + Math.sin(t * 9) * 0.12);
      leftArm.rotation.z = -up;
      rightArm.rotation.z = up;
      root.position.y =
        reducedMotion ? 0 : Math.abs(Math.sin(p * Math.PI * 3)) * 0.55 * (1 - p);
      return;
    }

    if (phase === "game-over") {
      // Defeat: a slump — bow and sink toward the Danger Line side,
      // arms hanging limp. Reduced motion keeps a mild, slow bow.
      const p = (reactionT.current = Math.min(1, reactionT.current + delta / 0.45));
      const slump = p * (reducedMotion ? 0.45 : 1);
      torso.rotation.z = -0.9 * slump;
      root.position.y = -0.2 * slump;
      leftArm.rotation.z = 0.1 * slump;
      rightArm.rotation.z = 0.55 - 0.45 * slump;
      return;
    }

    // Attack swing: raise and chop toward the enemies, back within ~0.3s.
    // Also restores whatever a finished celebration or slump left behind.
    torso.rotation.z = 0;
    root.position.y = 0;
    leftArm.rotation.z = 0;
    if (swingT.current < 1) {
      swingT.current = Math.min(1, swingT.current + delta / 0.28);
      const p = swingT.current;
      rightArm.rotation.z = 0.55 + (reducedMotion ? 0.6 : 1.7) * Math.sin(Math.PI * p);
    } else {
      rightArm.rotation.z = 0.55;
    }
  });

  return (
    <group ref={rootRef} position={[laneToWorldX(PLAYER_LANE), 0, 0.6]}>
      <group ref={torsoRef}>
        {/* legs */}
        <mesh position={[-0.2, 0.42, 0]}>
          <boxGeometry args={[0.34, 0.85, 0.34]} />
          <meshLambertMaterial color="#3b5a8a" />
        </mesh>
        <mesh position={[0.2, 0.42, 0]}>
          <boxGeometry args={[0.34, 0.85, 0.34]} />
          <meshLambertMaterial color="#3b5a8a" />
        </mesh>
        {/* torso in a teal tunic */}
        <mesh position={[0, 1.35, 0]}>
          <boxGeometry args={[0.95, 1.0, 0.5]} />
          <meshLambertMaterial color="#2f8f83" />
        </mesh>
        {/* head */}
        <mesh position={[0, 2.22, 0]}>
          <boxGeometry args={[0.72, 0.72, 0.72]} />
          <meshLambertMaterial color="#eab98b" />
        </mesh>
        <mesh position={[0, 2.62, 0]}>
          <boxGeometry args={[0.76, 0.16, 0.76]} />
          <meshLambertMaterial color="#4a2f1d" />
        </mesh>
        <mesh position={[-0.16, 2.26, 0.37]}>
          <boxGeometry args={[0.11, 0.13, 0.02]} />
          <meshLambertMaterial color="#20303f" />
        </mesh>
        <mesh position={[0.16, 2.26, 0.37]}>
          <boxGeometry args={[0.11, 0.13, 0.02]} />
          <meshLambertMaterial color="#20303f" />
        </mesh>
      </group>
      {/* left arm hangs and sways */}
      <group ref={leftArmRef} position={[-0.63, 1.78, 0]}>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.26, 0.92, 0.26]} />
          <meshLambertMaterial color="#2f8f83" />
        </mesh>
        <mesh position={[0, -0.92, 0]}>
          <boxGeometry args={[0.24, 0.16, 0.24]} />
          <meshLambertMaterial color="#eab98b" />
        </mesh>
      </group>
      {/* right arm holds the tool and swings on every correct key */}
      <group ref={rightArmRef} position={[0.63, 1.78, 0]} rotation={[0, 0, 0.55]}>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.26, 0.92, 0.26]} />
          <meshLambertMaterial color="#2f8f83" />
        </mesh>
        <mesh position={[0, -0.92, 0]}>
          <boxGeometry args={[0.24, 0.16, 0.24]} />
          <meshLambertMaterial color="#eab98b" />
        </mesh>
        {/* pickaxe: handle along the arm's reach, crossbar head */}
        <mesh position={[-0.12, -1.25, 0]} rotation={[0, 0, 0.35]}>
          <boxGeometry args={[0.09, 1.05, 0.09]} />
          <meshLambertMaterial color="#6b4a2a" />
        </mesh>
        <mesh position={[-0.34, -1.72, 0]} rotation={[0, 0, 0.35]}>
          <boxGeometry args={[0.62, 0.15, 0.15]} />
          <meshLambertMaterial color="#9aa7b5" />
        </mesh>
      </group>
    </group>
  );
}
