"use client";

// The Level Select route's client half: reads the saved history through
// the GameStorage interface and feeds it to the presentational grid as
// props, then carries the keyboard side of the loop — arrows choose among
// the unlocked Levels, Enter plays, Esc goes home.

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { LevelSelect, completedIdsFromProgress, type LevelProgress } from "./level-select";
import { completedLevelIds, isLevelUnlocked, starsFor } from "@/lib/game/progression";
import type { Level } from "@/lib/game/levels";
import { bestOfResults } from "@/lib/game/storage";
import { gameStorage } from "@/lib/game/storage-client";

export function LevelSelectScreen({ levels }: { levels: readonly Level[] }) {
  const router = useRouter();
  const [progress, setProgress] = useState<Record<string, LevelProgress>>({});
  const [selectedOverride, setSelectedOverride] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const results = await gameStorage().loadLevelResults();
        const completed = completedLevelIds(results);
        const map: Record<string, LevelProgress> = {};
        for (const level of levels) {
          const best = bestOfResults(results, level.id);
          if (!best || !isLevelUnlocked(level.id, completed)) continue;
          // A pre-run-time result cannot meet a time target, so it caps at
          // two stars rather than guessing its pace.
          const stars = Math.max(
            ...results
              .filter((result) => result.levelId === level.id)
              .map((result) =>
                starsFor(
                  {
                    accuracy: result.accuracy,
                    elapsedSeconds:
                      typeof result.elapsedSeconds === "number"
                        ? result.elapsedSeconds
                        : Number.POSITIVE_INFINITY,
                  },
                  level,
                ),
              ),
          );
          map[level.id] = { best, stars };
        }
        setProgress(map);
      } catch {
        // Storage read failed: a fresh profile view, Level 1 only.
      }
    })();
  }, [levels]);

  const completed = completedIdsFromProgress(progress);
  const playable = levels.filter((level) => isLevelUnlocked(level.id, completed));
  const selectedId = playable.some((level) => level.id === selectedOverride)
    ? selectedOverride
    : playable[0]?.id ?? null;

  const play = useCallback((levelId: string) => router.push(`/level/${levelId}`), [router]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        router.push("/");
        return;
      }
      if (!event.key.startsWith("Arrow") || playable.length === 0) return;
      event.preventDefault();
      const current = playable.findIndex((level) => level.id === selectedId);
      const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
      const next = playable[(current + step + playable.length) % playable.length];
      setSelectedOverride(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, playable, selectedId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" && selectedId) play(selectedId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [play, selectedId]);

  return (
    <LevelSelect
      levels={levels}
      progress={progress}
      selectedId={selectedId}
      onPlay={play}
    />
  );
}
