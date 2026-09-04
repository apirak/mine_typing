"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group, InstancedMesh, MeshLambertMaterial } from "three";
import { Color, Object3D } from "three";

import { laneToWorldX } from "@/lib/game/layout";
import { seededRandom } from "@/lib/game/random";
import { useGameStore } from "@/lib/game/store";

import { EnemyWord } from "./enemy-word";
import { useReducedMotion } from "../use-reduced-motion";

const FLASH = new Color("#ff5148");

type Debris = {
  velocity: [number, number, number];
  spin: [number, number, number];
  size: number;
};

const random = seededRandom(0x9e3779b9);

// One original voxel zombie: chunky body parts in articulated groups so
// idle sway, hit flinch, and voxel-scatter defeat can animate them.
export function VoxelZombie({ id, lane }: { id: number; lane: number }) {
  const enemy = useGameStore((state) => state.enemies.find((candidate) => candidate.id === id));
  const sequence = useGameStore((state) => state.sequence);
  const reducedMotion = useReducedMotion();

  const bodyRef = useRef<Group>(null);
  const skinRef = useRef<MeshLambertMaterial>(null);
  const clothRef = useRef<MeshLambertMaterial>(null);
  const debrisRef = useRef<InstancedMesh>(null);
  const [bursting, setBursting] = useState(false);
  const flinchT = useRef(1);
  const burstT = useRef(0);
  const lastPulse = useRef(enemy?.pulse ?? 0);
  const wasDefeated = useRef(enemy?.defeated ?? false);
  const phase = useMemo(() => lane * 0.11, [lane]);
  const worldX = laneToWorldX(lane);

  const debris = useMemo<Debris[]>(
    () =>
      Array.from({ length: 24 }, () => ({
        velocity: [
          (random() - 0.2) * 4.4,
          2.4 + random() * 3.4,
          (random() - 0.5) * 3.2,
        ] as [number, number, number],
        spin: [(random() - 0.5) * 9, (random() - 0.5) * 9, (random() - 0.5) * 9],
        size: 0.14 + random() * 0.2,
      })),
    [],
  );

  // Per-instance debris colors, set once when the burst mesh mounts.
  const attachDebris = (mesh: InstancedMesh | null) => {
    debrisRef.current = mesh;
    if (!mesh) return;
    const color = new Color();
    debris.forEach((_, index) => {
      mesh.setColorAt(index, color.set(random() > 0.4 ? "#6fa84e" : "#4a7a44"));
    });
    // setColorAt above has created the instance color attribute.
    mesh.instanceColor!.needsUpdate = true;
  };

  useEffect(() => {
    if (!enemy) return;
    // A restart revives every enemy; re-arm the burst trigger and clean up
    // any burst still in flight.
    if (!enemy.defeated && wasDefeated.current) {
      wasDefeated.current = false;
      setBursting(false);
    }
    if (enemy.pulse !== lastPulse.current) {
      lastPulse.current = enemy.pulse;
      flinchT.current = 0;
    }
    if (enemy.defeated && !wasDefeated.current) {
      wasDefeated.current = true;
      burstT.current = 0;
      setBursting(true);
    }
  }, [enemy]);

  useFrame(({ clock }, delta) => {
    const body = bodyRef.current;
    if (bursting) {
      burstT.current += delta;
      const mesh = debrisRef.current;
      const elapsed = burstT.current;
      if (mesh) {
        const dummy = new Object3D();
        debris.forEach((piece, index) => {
          const time = Math.min(elapsed, 1.7);
          dummy.position.set(
            worldX + piece.velocity[0] * time,
            1.3 + piece.velocity[1] * time - 4.9 * time * time,
            piece.velocity[2] * time,
          );
          dummy.rotation.set(
            piece.spin[0] * time,
            piece.spin[1] * time,
            piece.spin[2] * time,
          );
          const fade = elapsed > 1.2 ? Math.max(0, 1 - (elapsed - 1.2) / 0.5) : 1;
          dummy.scale.setScalar(Math.max(piece.size * fade, 0.0001));
          dummy.updateMatrix();
          mesh.setMatrixAt(index, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }
      if (elapsed > 1.7) setBursting(false);
      return;
    }

    if (!body || !enemy || enemy.defeated) return;
    const t = clock.getElapsedTime();

    // Idle sway + bob, toned down (or off) under reduced motion.
    const swayStrength = reducedMotion ? 0 : 0.05;
    body.rotation.y = Math.sin(t * 1.2 + phase) * swayStrength;
    body.position.y = reducedMotion ? 0 : Math.abs(Math.sin(t * 2.1 + phase)) * 0.04;

    // Hit flinch: lean back toward +x and flash red, decaying fast.
    if (flinchT.current < 1) {
      flinchT.current = Math.min(1, flinchT.current + delta / 0.3);
      const p = flinchT.current;
      body.rotation.z = reducedMotion ? 0 : -0.3 * Math.sin(Math.PI * p);
      const flash = reducedMotion ? (p < 0.5 ? 0.7 : 0) : 0.8 * Math.sin(Math.PI * p);
      skinRef.current?.emissive.copy(FLASH).multiplyScalar(flash);
      clothRef.current?.emissive.copy(FLASH).multiplyScalar(flash * 0.6);
    } else {
      body.rotation.z = 0;
      skinRef.current?.emissive.setScalar(0);
      clothRef.current?.emissive.setScalar(0);
    }
  });

  if (!enemy) return null;

  if (enemy.defeated) {
    return (
      <instancedMesh
        ref={attachDebris}
        args={[undefined, undefined, debris.length]}
        visible={bursting}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial />
      </instancedMesh>
    );
  }

  return (
    <group position={[worldX, 0, 0]}>
      <group ref={bodyRef}>
        {/* legs */}
        <mesh position={[-0.18, 0.4, 0]}>
          <boxGeometry args={[0.3, 0.8, 0.3]} />
          <meshLambertMaterial color="#33502f" />
        </mesh>
        <mesh position={[0.18, 0.4, 0]}>
          <boxGeometry args={[0.3, 0.8, 0.3]} />
          <meshLambertMaterial color="#33502f" />
        </mesh>
        {/* torso */}
        <mesh position={[0, 1.28, 0]}>
          <boxGeometry args={[0.85, 0.95, 0.45]} />
          <meshLambertMaterial ref={clothRef} color="#4a7a44" />
        </mesh>
        {/* arms reaching toward the Player */}
        <group position={[-0.55, 1.62, 0]} rotation={[0, 0, -(Math.PI / 2 - 0.18)]}>
          <mesh position={[0, -0.34, 0]}>
            <boxGeometry args={[0.24, 0.75, 0.24]} />
            <meshLambertMaterial color="#6fa84e" />
          </mesh>
        </group>
        <group position={[0.55, 1.62, 0]} rotation={[0, 0, -(Math.PI / 2 - 0.1)]}>
          <mesh position={[0, -0.34, 0]}>
            <boxGeometry args={[0.24, 0.75, 0.24]} />
            <meshLambertMaterial color="#6fa84e" />
          </mesh>
        </group>
        {/* head */}
        <mesh position={[0, 2.12, 0]}>
          <boxGeometry args={[0.62, 0.62, 0.62]} />
          <meshLambertMaterial ref={skinRef} color="#6fa84e" />
        </mesh>
        <mesh position={[0, 2.48, 0]}>
          <boxGeometry args={[0.66, 0.14, 0.66]} />
          <meshLambertMaterial color="#3c5c2e" />
        </mesh>
        {/* eyes on the camera-facing side */}
        <mesh position={[-0.14, 2.18, 0.32]}>
          <boxGeometry args={[0.1, 0.12, 0.02]} />
          <meshLambertMaterial color="#1c2417" />
        </mesh>
        <mesh position={[0.14, 2.18, 0.32]}>
          <boxGeometry args={[0.1, 0.12, 0.02]} />
          <meshLambertMaterial color="#1c2417" />
        </mesh>
      </group>
      <EnemyWord word={enemy.word} sequence={sequence} baseY={3.15} phase={phase} />
    </group>
  );
}
