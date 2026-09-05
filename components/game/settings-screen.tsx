"use client";

// The Settings screen (plan_a §13): every persisted toggle in one place,
// driven by the store's setters so a change saves through the same chain
// gameplay uses. Native buttons, range, and radios keep the screen fully
// keyboard-operable; Esc goes home.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

import { useGameStore } from "@/lib/game/store";

type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

const Toggle = ({ label, checked, onChange }: ToggleProps) => (
  <div className="setting-row">
    <span id={`setting-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{label}</span>
    <button
      role="switch"
      aria-checked={checked}
      className={`setting-toggle ${checked ? "is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      {checked ? "On" : "Off"}
    </button>
  </div>
);

export function SettingsScreen() {
  const router = useRouter();
  const sound = useGameStore((state) => state.sound);
  const music = useGameStore((state) => state.music);
  const volume = useGameStore((state) => state.volume);
  const reducedMotion = useGameStore((state) => state.reducedMotion);
  const showVirtualKeyboard = useGameStore((state) => state.showVirtualKeyboard);
  const toggleSound = useGameStore((state) => state.toggleSound);
  const toggleMusic = useGameStore((state) => state.toggleMusic);
  const setVolume = useGameStore((state) => state.setVolume);
  const setReducedMotion = useGameStore((state) => state.setReducedMotion);
  const setShowVirtualKeyboard = useGameStore((state) => state.setShowVirtualKeyboard);
  const resetProgress = useGameStore((state) => state.resetProgress);

  // Reset needs a second press: destructive on storage, so no accidental
  // single keypress wipes a profile.
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    void useGameStore.getState().hydrate();
  }, []);

  const goHome = () => router.push("/");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") goHome();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <main className="game-shell">
    <section className="menu-frame" aria-label="Settings">
      <header className="menu-head">
        <small>SYSTEM</small>
        <h1>Settings</h1>
      </header>
      <div className="settings-list">
        <Toggle label="Music" checked={music} onChange={() => toggleMusic()} />
        <Toggle label="Sound effects" checked={sound} onChange={() => toggleSound()} />
        <div className="setting-row">
          <span id="setting-volume">Volume</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={volume}
            aria-labelledby="setting-volume"
            onChange={(event) => setVolume(event.target.valueAsNumber)}
          />
          <output className="setting-value">{volume}</output>
        </div>
        <Toggle
          label="Show virtual keyboard"
          checked={showVirtualKeyboard}
          onChange={setShowVirtualKeyboard}
        />
        <fieldset className="setting-row setting-radios">
          <legend>Reduced motion</legend>
          {[
            { label: "System", value: null },
            { label: "On", value: true },
            { label: "Off", value: false },
          ].map(({ label, value }) => (
            <label key={label} className="setting-radio">
              <input
                type="radio"
                name="reduced-motion"
                checked={reducedMotion === value}
                onChange={() => setReducedMotion(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <div className="setting-row">
          <span>Progress</span>
          {confirmingReset ? (
            <button
              className="setting-danger"
              onClick={() => { resetProgress(); setConfirmingReset(false); }}
              onBlur={() => setConfirmingReset(false)}
            >
              Press again to erase <RotateCcw size={16}/>
            </button>
          ) : (
            <button className="setting-button" onClick={() => setConfirmingReset(true)}>
              Reset progress
            </button>
          )}
        </div>
      </div>
      <p className="menu-hint">Esc goes back</p>
    </section>
  </main>;
}
