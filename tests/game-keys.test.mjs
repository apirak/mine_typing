import assert from "node:assert/strict";
import test, { after } from "node:test";

import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@" : root } },
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

test("a Latin letter keeps the case it was typed with", () => {
  assert.equal(typedKeyFromEvent({ key: "f", code: "KeyF" }), "f");
  assert.equal(typedKeyFromEvent({ key: "F", code: "KeyF" }), "F");
  assert.equal(typedKeyFromEvent({ key: "z", code: "KeyZ" }), "z");
  assert.equal(typedKeyFromEvent({ key: "Z", code: "KeyZ" }), "Z");
});

test("the semicolon passes through as its own game key", () => {
  assert.equal(typedKeyFromEvent({ key: ";", code: "Semicolon" }), ";");
});

test("digits map straight through", () => {
  assert.equal(typedKeyFromEvent({ key: "1", code: "Digit1" }), "1");
  assert.equal(typedKeyFromEvent({ key: "0", code: "Digit0" }), "0");
});

test("the curriculum's punctuation maps straight through", () => {
  assert.equal(typedKeyFromEvent({ key: ".", code: "Period" }), ".");
  assert.equal(typedKeyFromEvent({ key: ",", code: "Comma" }), ",");
  assert.equal(typedKeyFromEvent({ key: "!", code: "Digit1", shiftKey: true }), "!");
  assert.equal(typedKeyFromEvent({ key: "?", code: "Slash", shiftKey: true }), "?");
  assert.equal(typedKeyFromEvent({ key: "'", code: "Quote" }), "'");
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
