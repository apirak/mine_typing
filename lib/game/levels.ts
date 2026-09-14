// The full five-world curriculum as plain data (spec #15): every Level's
// spawn queue, Enemy speed variants, walk speed, spawn timing, and the
// three-star time target are transcribed from plan/level.md (§5–9), the
// script-verified design contract. No React, no DOM, no three.js — Worlds
// are groups of Levels, and one flat ordered list drives progression. Words
// are stored exactly as the player must type them: lowercase letters in
// Worlds 1–3, Shift capitals / digits / punctuation where those Worlds
// introduce them. The 0.6× drill rhythm factor is a planning-model constant
// only — drill patterns are ordinary queue entries with no runtime meaning.

export type EnemyVariant = "walker" | "runner" | "tank";

/** One Enemy kind per World (CONTEXT.md); Witch and Little Zombie reuse the voxel rig. */
export type EnemyKind = "zombie" | "skeleton" | "creeper" | "witch" | "little-zombie";

/** One spawn-queue entry: the Word plus its speed variant (walker by default). */
export type WordEntry = {
  word: string;
  variant?: Exclude<EnemyVariant, "walker">;
};

const walker = (word: string): WordEntry => ({ word });
const runner = (word: string): WordEntry => ({ word, variant: "runner" });
const tank = (word: string): WordEntry => ({ word, variant: "tank" });

export type Level = {
  /** Route id for the Level's gameplay URL, e.g. "1-1". */
  id: string;
  /** HUD title, e.g. "Level 1-1 · F + J". */
  name: string;
  /** The World this Level belongs to (1–5). */
  world: number;
  /** HUD kicker naming this World's training theme. */
  worldLabel: string;
  /** The World's Enemy kind, for the scene. */
  enemyKind: EnemyKind;
  /** The keys this Level introduces or drills; highlighted in HUD and keyboard. */
  trainedKeys: string[];
  /** Trained keys plus every previously learned key — the Word alphabet. */
  learnedKeys: string[];
  /** Spawn queue in order; one entry per Enemy. */
  entries: readonly WordEntry[];
  /** Base Enemy walk speed in world units per second (variants scale it). */
  walkSpeed: number;
  /** Base seconds between spawn events (the schedule jitters around it). */
  spawnInterval: number;
  /** Seconds under which a ≥95% accuracy run earns three stars. */
  timeTarget: number;
};

export type World = {
  id: number;
  /** Level Select group header, e.g. "ZOMBIE WORLD". */
  label: string;
  levels: Level[];
};

type LevelSpec = Omit<Level, "id" | "world" | "worldLabel" | "enemyKind" | "learnedKeys"> & {
  /** The Level's number inside its World, e.g. 3 for "1-3". */
  level: number;
};

// learnedKeys accumulate along the curriculum order, so each Level declares
// only its own trained keys; the builder stamps the union of everything so far.
const buildWorld = (
  id: number,
  label: string,
  worldLabel: string,
  enemyKind: EnemyKind,
  specs: readonly LevelSpec[],
  learned: string[],
): World => ({
  id,
  label,
  levels: specs.map(({ level: nth, ...spec }) => {
    for (const key of spec.trainedKeys) {
      if (!learned.includes(key)) learned.push(key);
    }
    return {
      ...spec,
      id: `${id}-${nth}`,
      world: id,
      worldLabel,
      enemyKind,
      learnedKeys: [...learned],
    };
  }),
});

const learned: string[] = [];

export const WORLD_ONE = buildWorld(
  1,
  "ZOMBIE WORLD",
  "HOME ROW",
  "zombie",
  [
    {
      level: 1,
      name: "Level 1-1 · F + J",
      trainedKeys: ["F", "J"],
      entries: [walker("f"), walker("j"), walker("f"), walker("fj"), walker("j"), walker("jf"), walker("f"), walker("j"), walker("fj"), walker("jf"), walker("fj"), walker("j")],
      walkSpeed: 0.85,
      spawnInterval: 5.5,
      timeTarget: 70,
    },
    {
      level: 2,
      name: "Level 1-2 · D + K",
      trainedKeys: ["D", "K"],
      entries: [walker("d"), walker("k"), walker("d"), walker("dk"), walker("k"), walker("kd"), walker("f"), walker("j"), walker("ddkk"), walker("fj"), walker("d"), walker("k"), walker("dk"), walker("kd"), walker("jf")],
      walkSpeed: 0.9,
      spawnInterval: 5,
      timeTarget: 82,
    },
    {
      level: 3,
      name: "Level 1-3 · S + L",
      trainedKeys: ["S", "L"],
      entries: [runner("s"), walker("l"), walker("s"), walker("sl"), walker("l"), walker("ls"), walker("d"), walker("k"), walker("dk"), runner("s"), walker("l"), walker("sl"), walker("fd"), walker("kj"), walker("ls"), walker("kd")],
      walkSpeed: 1,
      spawnInterval: 4.5,
      timeTarget: 77,
    },
    {
      level: 4,
      name: "Level 1-4 · A + ;",
      trainedKeys: ["A", ";"],
      entries: [walker("a"), runner(";"), walker("a"), walker("a;"), walker(";"), walker(";a"), walker("s"), runner("l"), walker("sl"), walker("a"), walker(";"), walker("a;"), walker("sd"), walker("lk"), walker("ja"), walker(";a"), walker("as"), walker("l;")],
      walkSpeed: 1.1,
      spawnInterval: 4,
      timeTarget: 77,
    },
    {
      level: 5,
      name: "Level 1-5 · G + H",
      trainedKeys: ["G", "H"],
      entries: [walker("g"), walker("h"), runner("g"), walker("gh"), walker("h"), walker("hg"), walker("ad"), walker("sl"), walker("fj"), walker("kj"), walker(";a"), walker("lg"), walker("gh"), walker("hg"), walker("gd"), walker("hl"), walker("ja"), walker("ks"), walker("lh"), walker("hk")],
      walkSpeed: 1.2,
      spawnInterval: 3.6,
      timeTarget: 77,
    },
  ],
  learned,
);

export const WORLD_TWO = buildWorld(
  2,
  "SKELETON WORLD",
  "TOP ROW",
  "skeleton",
  [
    {
      level: 1,
      name: "Level 2-1 · R + U (drill)",
      trainedKeys: ["R", "U"],
      entries: [runner("r"), walker("u"), walker("f"), walker("j"), walker("ru"), walker("ur"), walker("juju"), walker("ujuj"), walker("jjuu"), walker("ujuj"), walker("jujuju"), runner("r"), walker("u"), walker("frfr"), walker("ru"), walker("ju")],
      walkSpeed: 1.05,
      spawnInterval: 4.2,
      timeTarget: 76,
    },
    {
      level: 2,
      name: "Level 2-2 · R + U (mixed)",
      trainedKeys: ["R", "U"],
      entries: [runner("r"), walker("u"), walker("r"), walker("ru"), walker("u"), walker("ur"), walker("f"), walker("j"), walker("fj"), runner("r"), walker("u"), walker("ru"), walker("ur"), walker("fr"), walker("rf"), walker("ju")],
      walkSpeed: 1.15,
      spawnInterval: 4.2,
      timeTarget: 74,
    },
    {
      level: 3,
      name: "Level 2-3 · E + I (drill)",
      trainedKeys: ["E", "I"],
      entries: [runner("e"), walker("i"), walker("d"), walker("k"), walker("ei"), walker("ie"), walker("ke"), walker("eiei"), walker("ieie"), walker("eeii"), walker("d"), runner("e"), walker("i"), walker("ei"), walker("eeii"), walker("eieiei")],
      walkSpeed: 1.2,
      spawnInterval: 3.8,
      timeTarget: 70,
    },
    {
      level: 4,
      name: "Level 2-4 · E + I (mixed)",
      trainedKeys: ["E", "I"],
      entries: [runner("e"), walker("i"), walker("e"), walker("ei"), walker("i"), walker("ie"), walker("d"), walker("k"), walker("dk"), runner("e"), walker("i"), walker("ei"), walker("ie"), walker("er"), walker("re"), walker("ik"), walker("de"), walker("ri")],
      walkSpeed: 1.2,
      spawnInterval: 4,
      timeTarget: 78,
    },
    {
      level: 5,
      name: "Level 2-5 · W + O (drill)",
      trainedKeys: ["W", "O"],
      entries: [runner("w"), walker("o"), walker("s"), walker("l"), walker("wo"), walker("ow"), walker("swsw"), walker("wsws"), walker("olol"), walker("lolo"), runner("w"), walker("o"), walker("sw"), walker("lo"), walker("wowo"), walker("wo")],
      walkSpeed: 1.25,
      spawnInterval: 3.4,
      timeTarget: 62,
    },
    {
      level: 6,
      name: "Level 2-6 · W + O (mixed)",
      trainedKeys: ["W", "O"],
      entries: [runner("w"), walker("o"), walker("w"), walker("wo"), walker("o"), walker("ow"), walker("s"), walker("l"), walker("sw"), runner("w"), walker("o"), walker("wo"), walker("ow"), walker("lo"), walker("ws"), walker("ok"), walker("wo"), walker("wo")],
      walkSpeed: 1.25,
      spawnInterval: 3.8,
      timeTarget: 74,
    },
    {
      level: 7,
      name: "Level 2-7 · Q + P (drill)",
      trainedKeys: ["Q", "P"],
      entries: [runner("q"), walker("p"), walker("a"), walker(";"), walker("qp"), walker("pq"), walker("qaqa"), walker(";p;p"), walker("qqpp"), walker("qpqp"), walker("a;a;"), runner("q"), walker("p"), walker(";q"), walker("ap"), walker("qpqp"), walker(";p")],
      walkSpeed: 1.3,
      spawnInterval: 3.4,
      timeTarget: 65,
    },
    {
      level: 8,
      name: "Level 2-8 · Q + P (mixed)",
      trainedKeys: ["Q", "P"],
      entries: [runner("q"), walker("p"), walker("q"), walker("qp"), walker("p"), walker("pq"), walker("a"), walker(";"), walker("q"), walker("p"), walker("qp"), walker("pq"), walker("sa"), walker("lp"), walker("ka"), walker(";q"), walker("ap"), walker("qa"), walker("ps"), walker("sw")],
      walkSpeed: 1.3,
      spawnInterval: 3.6,
      timeTarget: 78,
    },
    {
      level: 9,
      name: "Level 2-9 · T + Y (drill)",
      trainedKeys: ["T", "Y"],
      entries: [runner("t"), walker("y"), walker("r"), walker("u"), walker("ty"), walker("yt"), walker("ftft"), walker("jyjy"), walker("gtgt"), walker("hyhy"), walker("tyty"), runner("t"), walker("y"), walker("tr"), walker("try"), walker("you"), walker("yt")],
      walkSpeed: 1.35,
      spawnInterval: 3.4,
      timeTarget: 66,
    },
    {
      level: 10,
      name: "Level 2-10 · T + Y (mixed)",
      trainedKeys: ["T", "Y"],
      entries: [runner("t"), walker("y"), walker("t"), walker("ty"), walker("y"), walker("yt"), walker("r"), walker("u"), walker("tr"), walker("yu"), runner("t"), walker("y"), walker("ty"), walker("yt"), walker("try"), walker("you"), walker("toy"), walker("out"), walker("ur"), walker("wo"), walker("yt"), walker("ty")],
      walkSpeed: 1.35,
      spawnInterval: 3.4,
      timeTarget: 80,
    },
  ],
  learned,
);

export const WORLD_THREE = buildWorld(
  3,
  "CREEPER WORLD",
  "BOTTOM ROW",
  "creeper",
  [
    {
      level: 1,
      name: "Level 3-1 · Two-letter words",
      trainedKeys: [],
      entries: [runner("a"), walker("is"), walker("it"), walker("as"), walker("if"), walker("of"), walker("to"), walker("do"), walker("go"), walker("up"), walker("us"), walker("we"), walker("at"), walker("is"), runner("to"), walker("so"), walker("it"), walker("as")],
      walkSpeed: 1.3,
      spawnInterval: 4.2,
      timeTarget: 80,
    },
    {
      level: 2,
      name: "Level 3-2 · N + M (drill)",
      trainedKeys: ["N", "M"],
      entries: [walker("sun"), walker("run"), walker("hnhn"), walker("man"), walker("nut"), walker("jmjm"), walker("net"), walker("jam"), walker("mmnn"), walker("map"), runner("no"), walker("mnmn")],
      walkSpeed: 1.3,
      spawnInterval: 5.5,
      timeTarget: 72,
    },
    {
      level: 3,
      name: "Level 3-3 · Three-letter words",
      trainedKeys: [],
      entries: [walker("sun"), walker("run"), walker("fun"), walker("nut"), walker("man"), walker("net"), runner("no"), walker("jam"), walker("map"), walker("ten"), runner("an"), walker("men"), walker("sun"), walker("man")],
      walkSpeed: 1.3,
      spawnInterval: 5.2,
      timeTarget: 79,
    },
    {
      level: 4,
      name: "Level 3-4 · B + C + V (drill)",
      trainedKeys: ["B", "C", "V"],
      entries: [walker("can"), walker("cab"), walker("dcdc"), walker("cap"), walker("cat"), walker("fvfv"), walker("cow"), walker("van"), walker("gbgb"), walker("job"), walker("cob"), walker("can"), runner("no")],
      walkSpeed: 1.35,
      spawnInterval: 5,
      timeTarget: 71,
    },
    {
      level: 5,
      name: "Level 3-5 · C + V (mixed)",
      trainedKeys: ["C", "V"],
      entries: [walker("can"), walker("cab"), walker("cap"), walker("cat"), walker("cow"), walker("van"), runner("an"), walker("vase"), walker("cape"), walker("cane"), walker("can"), walker("cow"), walker("cap"), runner("no")],
      walkSpeed: 1.35,
      spawnInterval: 5,
      timeTarget: 77,
    },
    {
      level: 6,
      name: "Level 3-6 · Z + X (drill)",
      trainedKeys: ["Z", "X"],
      entries: [walker("zip"), walker("zap"), walker("azaz"), walker("zoo"), walker("six"), walker("sxsx"), walker("mix"), walker("box"), walker("wax"), walker("szsz"), walker("fox"), walker("tax"), runner("an")],
      walkSpeed: 1.4,
      spawnInterval: 4.6,
      timeTarget: 66,
    },
    {
      level: 7,
      name: "Level 3-7 · Z + X (mixed)",
      trainedKeys: ["Z", "X"],
      entries: [walker("zip"), walker("zap"), walker("zoo"), walker("box"), walker("fox"), walker("six"), walker("mix"), runner("an"), walker("wax"), walker("tax"), walker("jump"), walker("star"), walker("stop"), walker("zip"), walker("fox")],
      walkSpeed: 1.5,
      spawnInterval: 4.6,
      timeTarget: 76,
    },
    {
      level: 8,
      name: "Level 3-8 · Five-letter words",
      trainedKeys: [],
      entries: [walker("plant"), walker("glass"), tank("snake"), walker("water"), walker("house"), tank("night"), walker("apple"), walker("money"), tank("garden"), walker("glass")],
      walkSpeed: 1.25,
      spawnInterval: 7.5,
      timeTarget: 80,
    },
    {
      level: 9,
      name: "Level 3-9 · Six-letter words",
      trainedKeys: [],
      entries: [walker("puzzle"), tank("animal"), walker("planet"), tank("sunset"), walker("ticket"), walker("hunter"), walker("singer"), tank("garden")],
      walkSpeed: 1.2,
      spawnInterval: 8,
      timeTarget: 68,
    },
  ],
  learned,
);

export const WORLD_FOUR = buildWorld(
  4,
  "WITCH WORLD",
  "SPECIAL KEYS",
  "witch",
  [
    {
      level: 1,
      name: "Level 4-1 · . and ,",
      trainedKeys: [".", ","],
      entries: [walker("run."), walker("yes."), runner("no"), walker("cat."), walker("map."), walker("sun."), walker("men."), walker("fox."), walker("n.n."), walker("m.m."), runner("."), runner(","), walker("."), walker(",")],
      walkSpeed: 1.3,
      spawnInterval: 4.2,
      timeTarget: 66,
    },
    {
      level: 2,
      name: "Level 4-2 · Shift + sentences",
      trainedKeys: [],
      entries: [runner("I"), walker("can"), walker("run."), walker("We"), walker("play."), walker("It"), walker("is"), walker("fun."), walker("She"), walker("can"), walker("jump.")],
      walkSpeed: 1.25,
      spawnInterval: 4.8,
      timeTarget: 61,
    },
    {
      level: 3,
      name: "Level 4-3 · Numbers",
      trainedKeys: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
      entries: [walker("12"), walker("34"), walker("56"), runner("78"), walker("123"), walker("456"), walker("789"), walker("2468"), walker("1357"), runner("90"), walker("12"), walker("34")],
      walkSpeed: 1.35,
      spawnInterval: 4,
      timeTarget: 56,
    },
    {
      level: 4,
      name: "Level 4-4 · Sentences + comma",
      trainedKeys: [","],
      entries: [walker("Yes,"), runner("I"), walker("can"), walker("jump."), walker("This"), walker("is"), walker("my"), walker("home."), walker("We"), walker("can"), walker("play.")],
      walkSpeed: 1.4,
      spawnInterval: 4.6,
      timeTarget: 58,
    },
    {
      level: 5,
      name: "Level 4-5 · ! ? '",
      trainedKeys: ["!", "?", "'"],
      entries: [walker("no!"), walker("yes?"), walker("it's"), walker("can't"), walker("don't"), walker("I'm"), walker("what?"), walker("stop!"), walker("wow!"), runner("!"), runner("?"), walker("'"), walker("!")],
      walkSpeed: 1.4,
      spawnInterval: 4.2,
      timeTarget: 62,
    },
    {
      level: 6,
      name: "Level 4-6 · Sentence review",
      trainedKeys: [],
      entries: [walker("How"), walker("are"), walker("you?"), runner("I"), walker("am"), walker("fine,"), walker("thank"), walker("you."), walker("What"), walker("is"), walker("your"), walker("name?")],
      walkSpeed: 1.45,
      spawnInterval: 4.8,
      timeTarget: 65,
    },
  ],
  learned,
);

export const WORLD_FIVE = buildWorld(
  5,
  "LITTLE ZOMBIE WORLD",
  "SENTENCES",
  "little-zombie",
  [
    {
      level: 1,
      name: "Level 5-1 · Five-word sentences",
      trainedKeys: [],
      entries: [runner("I"), walker("like"), walker("to"), walker("play"), walker("games."), walker("We"), walker("go"), runner("to"), walker("school"), walker("every"), walker("day.")],
      walkSpeed: 1.45,
      spawnInterval: 4.6,
      timeTarget: 59,
    },
    {
      level: 2,
      name: "Level 5-2 · Six-word sentences",
      trainedKeys: [],
      entries: [walker("My"), walker("brother"), walker("likes"), runner("to"), walker("eat"), walker("fruit."), walker("The"), walker("dog"), walker("runs"), runner("in"), walker("the"), walker("park.")],
      walkSpeed: 1.5,
      spawnInterval: 4.8,
      timeTarget: 66,
    },
    {
      level: 3,
      name: "Level 5-3 · Sentences + numbers",
      trainedKeys: [],
      entries: [walker("There"), walker("are"), runner("3"), walker("cats"), walker("and"), runner("2"), walker("dogs."), walker("Call"), walker("me"), walker("at"), runner("5"), walker("pm"), walker("today.")],
      walkSpeed: 1.55,
      spawnInterval: 4,
      timeTarget: 61,
    },
    {
      level: 4,
      name: "Level 5-4 · The finale",
      trainedKeys: [],
      entries: [walker("Practice"), walker("every"), walker("day"), walker("and"), walker("you"), walker("will"), walker("type"), walker("faster!"), walker("Typing"), walker("is"), runner("a"), walker("super"), walker("power!")],
      walkSpeed: 1.6,
      spawnInterval: 5,
      timeTarget: 74,
    },
  ],
  learned,
);

export const WORLDS: readonly World[] = [WORLD_ONE, WORLD_TWO, WORLD_THREE, WORLD_FOUR, WORLD_FIVE];

/** The curriculum as one ordered list — the unlock chain's source of truth. */
export const ALL_LEVELS: readonly Level[] = WORLDS.flatMap((world) => world.levels);

/** The Level played at a route id; undefined for unknown routes. */
export function getLevel(id: string): Level | undefined {
  return ALL_LEVELS.find((level) => level.id === id);
}

/** The Level's Words in spawn order. */
export function levelWords(level: Level): string[] {
  return level.entries.map((entry) => entry.word);
}

/**
 * Pair-spawn probability for a Level (plan/level.md §2.2): none in the two
 * calm openers, 10% from 1-3 through World 2, 15% in Worlds 3–4, 20% in
 * World 5 — the game's most unpredictable rhythm.
 */
export function pairSpawnChance(level: Level): number {
  const nth = Number(level.id.split("-")[1]);
  if (Number.isNaN(nth)) return 0;
  if (level.world === 1 && nth <= 2) return 0;
  if (level.world <= 2) return 0.1;
  if (level.world <= 4) return 0.15;
  return 0.2;
}

/** Standard touch-typing finger per key, for the hint line. */
export const KEY_FINGERS: Readonly<Record<string, string>> = {
  Q: "Left pinky finger",
  W: "Left ring finger",
  E: "Left middle finger",
  R: "Left index finger",
  T: "Left index finger",
  Y: "Right index finger",
  U: "Right index finger",
  I: "Right middle finger",
  O: "Right ring finger",
  P: "Right pinky finger",
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
  Z: "Left pinky finger",
  X: "Left ring finger",
  C: "Left middle finger",
  V: "Left index finger",
  B: "Left index finger",
  N: "Right index finger",
  M: "Right index finger",
  "1": "Left pinky finger",
  "2": "Left ring finger",
  "3": "Left middle finger",
  "4": "Left index finger",
  "5": "Left index finger",
  "6": "Right index finger",
  "7": "Right index finger",
  "8": "Right middle finger",
  "9": "Right ring finger",
  "0": "Right pinky finger",
  ".": "Right ring finger",
  ",": "Right middle finger",
  "!": "Left pinky finger",
  "?": "Right pinky finger",
  "'": "Right pinky finger",
};
