"use client";

import { useEffect, useState } from "react";

import { useGameStore } from "@/lib/game/store";

// Reduced motion (spec #2): an explicit stored setting wins; with no
// stored choice (null) the scene follows the OS preference as before.
export function useReducedMotion(): boolean {
  const stored = useGameStore((state) => state.reducedMotion);
  const [osReduced, setOsReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setOsReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return stored ?? osReduced;
}
