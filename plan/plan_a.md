# Voxel Typing Game — Product Brief

## 1. Goal

Create a web-based touch-typing game that improves:

- Keyboard familiarity
- Typing accuracy
- Finger movement
- Typing speed

The game should feel playful and responsive, not like a traditional typing exercise.

---

## 2. Visual Direction

Use an original **voxel sandbox style**:

- Block-based characters and environments
- Cute character animations
- Bright, friendly colors
- Simple visual effects
- Side-view 3D environment

Do not copy Minecraft assets, characters, sounds, logos, or textures. “Minecraft Typing” is only a temporary project name.

---

## 3. Game Perspective

The game uses a **2.5D side view**, similar to a classic side-scrolling action game.

- The player stands near the far-left side.
- Enemies spawn on the right.
- Enemies walk from right to left.
- The player does not move manually.
- Typing is the only gameplay control.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [Pause]                                      Accuracy 96%  Combo ×4 │
│                                                                      │
│              A                  AS              ASK                  │
│             [Z]                [Z]              [Z]                  │
│                 ← walking       ← walking        ← walking           │
│                                                                      │
│  [PLAYER]                                                           │
│     ⚔                         DANGER LINE                            │
├──────────────────────────────────────────────────────────────────────┤
│██████████████████████████████████████████████████████████████████████│
└──────────────────────────────────────────────────────────────────────┘
```

> This brief places the player on the left because the enemies move from right to left.

---

## 4. Core Gameplay

Each enemy has a letter sequence or word above its head.

```text
A      AS      ASK      ADD
```

The player defeats enemies by typing their text correctly.

Every correct key:

1. Hits every matching enemy.
2. Plays a short hit animation.
3. Briefly stops the matching enemies.
4. Changes the matched letter from white to red.

An enemy is defeated when all its letters have been matched.

---

## 5. Target-Matching Rules

The game uses a **candidate group** instead of selecting only one enemy.

### Initial state

```text
ASK        ADD        SUN
[Z]        [Z]        [Z]
```

All letters are white.

### Player types `A`

```text
[a]SK      [a]DD      SUN
 HIT        HIT
```

- `ASK` and `ADD` are both hit.
- Both enemies enter the candidate group.
- `SUN` is ignored.
- `[a]` represents a matched letter displayed in red.

### Player types `S`

```text
[a][s]K    ADD        SUN
   HIT      RESET
```

- `ASK` is hit again.
- `ADD` no longer matches and leaves the candidate group.
- All letters on `ADD` return to white.

### Player types `K`

```text
[a][s][k]
 DEFEATED
```

- `ASK` is defeated.
- The candidate group is cleared.
- Every surviving enemy returns to white text.
- The next key starts a new search.

### Matching logic

```text
No active target
       │
       ▼
Player types the first key
       │
       ▼
Find all enemies beginning with that key
       │
       ▼
Create candidate group
       │
       ▼
Player types the next key
       │
       ▼
Keep only enemies matching the full typed sequence
       │
       ├── No enemies match → Miss and reset
       │
       └── Enemy text completed → Defeat enemy and reset
```

Multiple enemies may be defeated together if they have identical text.

---

## 6. Incorrect Input

If the player types an incorrect key:

- No enemy is hit.
- Play a short miss sound.
- Show a small red feedback effect.
- Reset the current candidate group.
- Return all enemy letters to white.
- Do not interrupt keyboard input with a modal or message.

The feedback should be clear but not distracting.

---

## 7. Enemy Behavior

Each enemy follows this state flow:

```text
SPAWN → WALK → HIT → WALK → DEFEATED
                 │
                 └── Reach player → GAME OVER
```

Rules:

- Enemies spawn on the right.
- They walk toward the player.
- A correct key briefly interrupts their movement.
- After the hit animation, they continue walking.
- An enemy is removed after its text is completed.
- The game ends when any enemy reaches the danger line.

For the first prototype, all enemies can move at the same speed.

---

## 8. Player Behavior

The player remains in one position.

Possible animations:

- Idle breathing
- Looking around
- Small playful movements
- Attack
- Miss
- Worried when an enemy gets close
- Victory celebration
- Game-over reaction

Each correct key triggers an attack animation, even when the enemy is far away.

---

## 9. Level Structure

### World 1: Zombies — Learn New Keys

Introduce two new keys at a time, beginning with the home row.

Example progression:

```text
Level 1: F J
Level 2: D K
Level 3: S L
Level 4: A ;
Level 5: G H
```

Enemies mainly use single letters.

```text
F    J    F    J
```

### World 2: Skeletons — Finger Association

Connect new keys with their home-row positions.

Example:

```text
F    R    FR    RF
J    U    JU    UJ
```

This teaches that `F` and `R` use the same finger, while `J` and `U` use the same finger.

### World 3: Creepers — Common Words

Use short, common English words containing only previously learned letters.

```text
as    do    run    jump    water
```

Start with 2-letter words and gradually increase to 7 letters.

### World 4: Dragon — Short Sentences

Use short sentences with spaces, capital letters, and punctuation.

```text
I can run.
This is my home.
We play together.
```

The exact sentence interaction will be designed after the word-based levels are validated.

---

## 10. Screens

### Home Screen

```text
┌──────────────────────────────────────────────┐
│                 GAME LOGO                    │
│                                              │
│              [Voxel Character]               │
│                                              │
│                 [ PLAY ]                     │
│               [ SETTINGS ]                   │
│                                              │
│                              [Sound] [Music] │
└──────────────────────────────────────────────┘
```

### Level Select

```text
┌──────────────────────────────────────────────┐
│ [Back]          ZOMBIE WORLD                 │
│                                              │
│    ★★★          ★★☆          🔒              │
│  [F + J]  ─── [D + K]  ─── [S + L]          │
│                                              │
│ Accuracy 98%   Accuracy 91%   Locked         │
│                                              │
│                 [PLAY]                       │
└──────────────────────────────────────────────┘
```

Each level shows:

- Keys being trained
- Locked, available, or completed state
- Best accuracy
- Best speed
- Stars earned

### Gameplay Screen

```text
┌──────────────────────────────────────────────────────────────┐
│ [Pause]       Level 1-3       Accuracy 96%       Combo ×7   │
│                                                              │
│                    [s]L          [s]S          D             │
│                     [Z]           [Z]          [Z]            │
│                       ←             ←            ←            │
│                                                              │
│ [PLAYER]  ⚔                    │ DANGER LINE                 │
├──────────────────────────────────────────────────────────────┤
│        A  S  D  [F]  G  H  [J]  K  L  ;                     │
│              Highlight the next useful keys                   │
└──────────────────────────────────────────────────────────────┘
```

### Result Screen

```text
┌──────────────────────────────────────────────┐
│               LEVEL COMPLETE                 │
│                    ★★★                       │
│                                              │
│ Accuracy                     96%              │
│ Correct Keys                 48               │
│ Mistyped Keys                 2               │
│ Speed                        31 CPM            │
│ Best Combo                   18               │
│                                              │
│ [RETRY]       [LEVEL SELECT]       [NEXT]     │
└──────────────────────────────────────────────┘
```

### Settings Screen

Include:

- Music on/off
- Sound effects on/off
- Volume
- Show virtual keyboard
- Reduced motion
- Full-screen mode
- Reset progress

---

## 11. Score and Progress

Track:

- Accuracy
- Correct keystrokes
- Incorrect keystrokes
- Characters per minute
- Completion time
- Enemies defeated
- Longest correct streak
- Frequently mistyped keys

Suggested star rules:

```text
★   Complete the level
★★  Complete with at least 90% accuracy
★★★ Complete with at least 95% accuracy and meet the time target
```

Accuracy should be more important than speed.

---

## 12. Data Storage

Phase 1 stores progress in the browser.

Use:

- `localStorage` for settings and basic progress
- `IndexedDB` for detailed play history

Keep storage separate from the game logic:

```ts
interface GameStorage {
  loadProfile(): Promise<PlayerProfile | null>;
  saveProfile(profile: PlayerProfile): Promise<void>;
  saveLevelResult(result: LevelResult): Promise<void>;
  loadLevelResults(): Promise<LevelResult[]>;
}
```

Implement:

```text
LocalGameStorage       Phase 1
FirestoreGameStorage   Phase 2
```

Each record should include:

```text
id
userId (optional in Phase 1)
createdAt
updatedAt
schemaVersion
```

This structure should allow Firebase Authentication and Firestore to be added later without rewriting the gameplay system.

---

## 13. Recommended Technology

Use:

```text
Language:       TypeScript
Game engine:    Phaser
Application UI: React
Build tool:     Vite
State:          Zustand or a small TypeScript store
Storage:        localStorage + IndexedDB
Testing:        Vitest + Playwright
Phase 2:        Firebase Authentication + Firestore
```

Use React for menus and interface screens. Use Phaser for the gameplay canvas, animation, audio, input, enemies, and game loop.

Do not use a full 3D engine for the first version. Create the 2.5D appearance with voxel-style sprites, layered backgrounds, shadows, lighting, and simple camera movement.

---

## 14. First Playable Prototype

Build only one playable level first.

Prototype requirements:

- One side-view environment
- One player character
- One enemy type
- Three to five enemies on screen
- Text containing one to four letters
- Enemies walking from right to left
- Candidate-group matching
- Correct and incorrect input feedback
- Hit animation
- Defeat animation
- Victory and game-over states
- Restart button
- Browser-based progress storage

Do not build all worlds before the core typing interaction has been tested.

---

## 15. Important UX Requirements

- Never require mouse input during gameplay.
- Capture typing immediately after the level begins.
- Ignore browser shortcuts and unsupported keys when possible.
- Keep enemy text large and readable.
- Do not allow text labels to overlap.
- Always show which letters have already matched.
- Feedback should appear immediately after every keypress.
- Keep animations short so they do not delay typing.
- Pause automatically if the browser tab loses focus.
- Support common desktop screen sizes.
- Prioritize keyboard play over mobile support.
- Include a reduced-motion option.
