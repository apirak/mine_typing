"use client";

// The fixed Side View scene (ADR 0001): sunset sky and lighting, voxel
// ground, drifting clouds, the Player at the far left, the four Zombies at
// their fixed lanes, and the Danger Line. Game rules live in the store —
// these components only read and animate.

import { useGameStore } from "@/lib/game/store";

import { BattlefieldGround, DangerLine, DriftingClouds, SunsetSky } from "./environment";
import { VoxelPlayer } from "./voxel-player";
import { VoxelZombie } from "./voxel-zombie";

export function Scene() {
  // The scene re-renders on every key; each VoxelZombie is keyed by enemy
  // id so its local animation state survives pulse/defeat updates.
  const enemies = useGameStore((state) => state.enemies);

  return (
    <>
      <fog attach="fog" args={["#d97a5a", 34, 68]} />
      <ambientLight intensity={0.7} color="#8a6aa8" />
      <hemisphereLight intensity={0.75} color="#b47ce8" groundColor="#3a2440" />
      <directionalLight position={[12, 9, -6]} intensity={2.1} color="#ffb26b" />
      <directionalLight position={[-6, 5, 9]} intensity={0.85} color="#7c9fd9" />
      <SunsetSky />
      <BattlefieldGround />
      <DriftingClouds />
      <DangerLine />
      <VoxelPlayer />
      {enemies.map((enemy) => (
        <VoxelZombie key={enemy.id} id={enemy.id} lane={enemy.lane} />
      ))}
    </>
  );
}
