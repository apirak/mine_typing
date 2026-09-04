"use client";

import { useEffect } from "react";

import { useGameStore } from "@/lib/game/store";

// plan_a §15: pause automatically when the browser tab loses focus. Lives
// DOM-side so it works with or without the 3D scene, and only interrupts a
// live run — pausing over game over or a cleared level does nothing.
export function useAutoPause() {
  const setPaused = useGameStore((state) => state.setPaused);

  useEffect(() => {
    const pause = () => {
      const state = useGameStore.getState();
      if (state.phase === "playing" && !state.paused) setPaused(true);
    };
    const onVisibilityChange = () => {
      if (document.hidden) pause();
    };

    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [setPaused]);
}
