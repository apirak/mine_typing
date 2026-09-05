"use client";

// The Home screen (plan_a §10): the game's front door with Play and
// Settings entries and the sound/music quick toggles. Keyboard-first:
// Enter plays, S opens Settings, M toggles music — every entry is also a
// real button, so mouse and touch fall out for free.

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Music, Play, Settings, Volume2, VolumeX } from "lucide-react";

import { typedKeyFromEvent } from "@/lib/game/keys";
import { useGameStore } from "@/lib/game/store";

export function HomeScreen() {
  const router = useRouter();
  const sound = useGameStore((state) => state.sound);
  const music = useGameStore((state) => state.music);
  const toggleSound = useGameStore((state) => state.toggleSound);
  const toggleMusic = useGameStore((state) => state.toggleMusic);

  // Restore persisted settings so the toggles mirror the player's choice.
  useEffect(() => {
    void useGameStore.getState().hydrate();
  }, []);

  const play = () => router.push("/levels");
  const openSettings = () => router.push("/settings");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // A focused control activates itself; the shortcuts stay free for
      // bare keypresses only.
      if (event.target instanceof HTMLElement && event.target.closest("button, input, a, select, textarea")) return;
      const key = typedKeyFromEvent(event);
      if (event.key === "Enter") {
        play();
      } else if (key === "S") {
        openSettings();
      } else if (key === "M") {
        toggleMusic();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <main className="game-shell">
    <section className="home-frame" aria-label="Home">
      <div className="home-hero">
        <div className="voxel-avatar" aria-hidden="true"><i /><i /><i /><i /></div>
        <h1>VOXEL TYPING</h1>
        <p className="home-tagline">Type the words. Hold the line.</p>
      </div>
      <nav className="home-menu" aria-label="Main menu">
        <button className="primary-button" onClick={play}><Play size={20} fill="currentColor"/> PLAY</button>
        <button className="secondary-button" onClick={openSettings}><Settings size={20}/> SETTINGS</button>
      </nav>
      <div className="home-toggles">
        <button className="icon-button" onClick={toggleSound} aria-label={sound ? "Mute sound" : "Enable sound"}>
          {sound ? <Volume2 size={22}/> : <VolumeX size={22}/>}
        </button>
        <button className="icon-button" onClick={toggleMusic} aria-label={music ? "Toggle music off" : "Toggle music on"}>
          <Music size={22} className={music ? undefined : "is-off"}/>
        </button>
      </div>
      <p className="menu-hint">Enter plays · S opens Settings · M toggles music</p>
    </section>
  </main>;
}
