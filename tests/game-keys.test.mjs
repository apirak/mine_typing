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

const { typedKeyFromEvent } = await vite.ssrLoadModule("/lib/game/keys.ts");

// Physical keyboards report the layout's character in `key` and the
// position of the pressed key in `code`. The game keyspace is A–Z plus
// the home-row semicolon, whatever the active input source is.

test("a Latin letter maps to its uppercase game key in any case", () => {
  assert.equal(typedKeyFromEvent({ key: "f", code: "KeyF" }), "F");
  assert.equal(typedKeyFromEvent({ key: "F", code: "KeyF" }), "F");
  assert.equal(typedKeyFromEvent({ key: "z", code: "KeyZ" }), "Z");
});

test("the semicolon passes through as its own game key", () => {
  assert.equal(typedKeyFromEvent({ key: ";", code: "Semicolon" }), ";");
});

test("a non-Latin input source falls back to the physical key position", () => {
  // Thai Kedmanee: the F position types "ฟ", the J position "แ".
  assert.equal(typedKeyFromEvent({ key: "ฟ", code: "KeyF" }), "F");
  assert.equal(typedKeyFromEvent({ key: "แ", code: "KeyJ" }), "J");
  // A dead key or accented character on the same position resolves too.
  assert.equal(typedKeyFromEvent({ key: "Dead", code: "KeyA" }), "A");
  assert.equal(typedKeyFromEvent({ key: "ƒ", code: "KeyF" }), "F");
});

test("keys outside the game keyspace return null", () => {
  assert.equal(typedKeyFromEvent({ key: "Shift", code: "ShiftLeft" }), null);
  assert.equal(typedKeyFromEvent({ key: "1", code: "Digit1" }), null);
  assert.equal(typedKeyFromEvent({ key: "Escape", code: "Escape" }), null);
  assert.equal(typedKeyFromEvent({ key: "ฟ", code: "" }), null);
});
