# Enemy text rendered in-scene with SDF (troika-three-text)

**Status**: accepted (2026-09-04) — deviates from the initial recommendation of an HTML overlay

The Word above each enemy's head is the game's most important UI. It is rendered **inside the 3D scene** as SDF text (troika-three-text) rather than as DOM overlaid on the canvas, so the text belongs to the world visually — it moves with enemies and scales with the scene.

## Trade-offs accepted

- **No DOM text**: screen readers can't read enemy words from the canvas. Mitigation: an offscreen `aria-live` mirror keeps announcing words and match state.
- **Legibility**: text billboards toward the fixed camera and the canvas caps devicePixelRatio to stay crisp.
- **Per-letter coloring** (white → red for matched letters): handled by per-letter markup/meshes inside troika.

An HTML overlay (crisper, trivially accessible) and canvas-texture sprites were considered and rejected in favor of in-scene SDF text for world integration.
