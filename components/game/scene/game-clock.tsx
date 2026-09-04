"use client";

import { useFrame } from "@react-three/fiber";

import { useGameStore } from "@/lib/game/store";

// The scene owns the frame clock (spec #2): every rendered frame advances
// the motion world through the store's tick. It contains no rules — dt is
// clamped so a backgrounded tab's long frame cannot teleport an Enemy.
export function GameClock() {
  const tick = useGameStore((state) => state.tick);
  useFrame((_, delta) => {
    tick(Math.min(delta, 0.1));
  });
  return null;
}
