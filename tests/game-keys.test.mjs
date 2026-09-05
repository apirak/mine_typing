import assert from "node:assert/strict";
import test, { after } from "node:test";

import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

const { typedKeyFromEvent, isForeignLetterEvent } = await vite.ssrLoadModule(
  "/lib/game/keys.ts",
);

// The game reads what the player actually typed (`key`), never which
// physical key it was (`code`): a non-English input source is the
// player's setup to fix, not the game's to reinterpret.

test("a Latin letter maps to its uppercase game key in any case", () => {
  assert.equal(typedKeyFromEvent({ key: "f", code: "KeyF" }), "F");
  assert.equal(typedKeyFromEvent({ key: "F", code: "KeyF" }), "F");
  assert.equal(typedKeyFromEvent({ key: "z", code: "KeyZ" }), "Z");
});

test("the semicolon passes through as its own game key", () => {
  assert.equal(typedKeyFromEvent({ key: ";", code: "Semicolon" }), ";");
});

test("non-Latin input never resolves through the key's position", () => {
  // Thai Kedmanee: the F position types "ฟ", the J position "แ".
  assert.equal(typedKeyFromEvent({ key: "ฟ", code: "KeyF" }), null);
  assert.equal(typedKeyFromEvent({ key: "แ", code: "KeyJ" }), null);
  // Dead keys and accents are foreign input too.
  assert.equal(typedKeyFromEvent({ key: "Dead", code: "KeyF" }), null);
  assert.equal(typedKeyFromEvent({ key: "ƒ", code: "KeyF" }), null);
});

test("a letter position typed with a non-Latin character raises the foreign flag", () => {
  assert.equal(isForeignLetterEvent({ key: "ฟ", code: "KeyF" }), true);
  assert.equal(isForeignLetterEvent({ key: "แ", code: "KeyJ" }), true);
  assert.equal(isForeignLetterEvent({ key: "Dead", code: "KeyA" }), true);
  assert.equal(isForeignLetterEvent({ key: "ƒ", code: "KeyF" }), true);
});

test("everything else stays outside the foreign flag", () => {
  assert.equal(isForeignLetterEvent({ key: "f", code: "KeyF" }), false);
  assert.equal(isForeignLetterEvent({ key: "F", code: "KeyF" }), false);
  assert.equal(isForeignLetterEvent({ key: "Shift", code: "ShiftLeft" }), false);
  assert.equal(isForeignLetterEvent({ key: "1", code: "Digit1" }), false);
  assert.equal(isForeignLetterEvent({ key: "Enter", code: "Enter" }), false);
  assert.equal(isForeignLetterEvent({ key: " ", code: "Space" }), false);
  assert.equal(isForeignLetterEvent({ key: "ฟ", code: "" }), false);
});
