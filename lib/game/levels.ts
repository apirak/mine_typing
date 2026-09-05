// World 1's Level definitions as plain data (spec #2 step 2): everything
// that distinguishes Levels — trained keys, the Word pool, Enemy speed,
// spawn timing, and the three-star time target — lives here. No React, no
// DOM, no three.js, so the data sits at the pure seam and Worlds 2–4 later
// need no gameplay-code changes. The time target is stored for ticket #6;
// stars are not computed yet.

export type Level = {
  /** Route id for the Level's gameplay URL. */
  id: string;
  /** HUD title, e.g. "Level 1 · F + J". */
  name: string;
  /** HUD kicker naming this World's training theme. */
  worldLabel: string;
  /** The keys this Level introduces; highlighted in HUD and keyboard. */
  trainedKeys: string[];
  /** Trained keys plus every previously learned key — the Word alphabet. */
  learnedKeys: string[];
  /** Word pool in spawn order, 1–4 letters, learned keys only. */
  words: string[];
  /** Enemy walk speed in world units per second. */
  walkSpeed: number;
  /** Seconds between Enemy spawns. */
  spawnInterval: number;
  /** Seconds under which a ≥95% accuracy run earns three stars. */
  timeTarget: number;
};

export const WORLD_ONE: readonly Level[] = [
  {
    id: "1",
    name: "Level 1 · F + J",
    worldLabel: "HOME ROW",
    trainedKeys: ["F", "J"],
    learnedKeys: ["F", "J"],
    words: ["F", "FJ", "J", "JF"],
    walkSpeed: 0.85,
    spawnInterval: 5,
    timeTarget: 40,
  },
  {
    id: "2",
    name: "Level 2 · D + K",
    worldLabel: "HOME ROW",
    trainedKeys: ["D", "K"],
    learnedKeys: ["D", "K", "F", "J"],
    words: ["D", "K", "DK", "FJ"],
    walkSpeed: 0.95,
    spawnInterval: 4.5,
    timeTarget: 45,
  },
  {
    id: "3",
    name: "Level 3 · S + L",
    worldLabel: "HOME ROW",
    trainedKeys: ["S", "L"],
    learnedKeys: ["S", "L", "D", "K", "F", "J"],
    words: ["S", "L", "SL", "FD"],
    walkSpeed: 1.05,
    spawnInterval: 4,
    timeTarget: 50,
  },
  {
    id: "4",
    name: "Level 4 · A + ;",
    worldLabel: "HOME ROW",
    trainedKeys: ["A", ";"],
    learnedKeys: ["A", ";", "S", "L", "D", "K", "F", "J"],
    words: ["A", ";", "A;", "SL"],
    walkSpeed: 1.15,
    spawnInterval: 3.5,
    timeTarget: 55,
  },
  {
    id: "5",
    name: "Level 5 · G + H",
    worldLabel: "HOME ROW",
    trainedKeys: ["G", "H"],
    learnedKeys: ["G", "H", "A", ";", "S", "L", "D", "K", "F", "J"],
    words: ["G", "H", "GH", "HG"],
    walkSpeed: 1.3,
    spawnInterval: 3,
    timeTarget: 60,
  },
];

/** The Level played at a route id; undefined for unknown routes. */
export function getLevel(id: string): Level | undefined {
  return WORLD_ONE.find((level) => level.id === id);
}

/** Standard touch-typing finger per home-row key, for the hint line. */
export const KEY_FINGERS: Readonly<Record<string, string>> = {
  A: "Left pinky finger",
  S: "Left ring finger",
  D: "Left middle finger",
  F: "Left index finger",
  G: "Left index finger",
  H: "Right index finger",
  J: "Right index finger",
  K: "Right middle finger",
  L: "Right ring finger",
  ";": "Right pinky finger",
};
