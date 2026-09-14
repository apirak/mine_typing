import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: {
    alias: [
      { find: /^next\/navigation$/, replacement: `${root}/tests/fake-navigation.ts` },
      { find: "@", replacement: root },
    ],
  },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

const { default: LevelPage } = await vite.ssrLoadModule(
  "/app/level/[id]/page.tsx",
);
const { ALL_LEVELS } = await vite.ssrLoadModule("/lib/game/levels.ts");

// The route page is an async server component; call it directly and render
// the element it resolves to (renderToStaticMarkup stays synchronous).
async function renderLevelRoute(id) {
  const element = await LevelPage({ params: Promise.resolve({ id }) });
  return renderToStaticMarkup(element);
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// renderToStaticMarkup escapes apostrophes in text and attributes.
const escapeHtml = (text) => escapeRegExp(text).replace(/'/g, "&#x27;");
const trainedHighlight = (key) =>
  new RegExp(`<button data-key="${escapeHtml(key)}"[^>]*class="[^"]*training-key`);

// Every curriculum route server-renders its own Level (spec #15: Worlds 4–5
// become playable automatically through the shared screen).
for (const level of ALL_LEVELS) {
  test(`route /level/${level.id} renders "${level.name}" with its training highlighted`, async () => {
    const html = await renderLevelRoute(level.id);

    assert.match(html, new RegExp(escapeHtml(level.name)));
    assert.match(html, new RegExp(escapeHtml(level.worldLabel)));
    for (const key of level.trainedKeys) {
      assert.match(html, trainedHighlight(key), `key ${key} not highlighted`);
    }
    // The hint line teaches each trained key's finger.
    for (const key of level.trainedKeys) {
      assert.match(html, new RegExp(escapeHtml(`<kbd>${key}</kbd>`)));
    }
  });
}

test("routes without trained keys highlight nothing but still render", async () => {
  const html = await renderLevelRoute("5-1");

  assert.match(html, /Level 5-1 · Five-word sentences/);
  assert.doesNotMatch(html, /training-key/);
  assert.match(html, /Type the words above to attack/);
});

test("each Level route server-renders that Level's own words and ready feedback", async () => {
  const html = await renderLevelRoute("1-4");

  assert.match(html, /18 enemies remaining\./);
  assert.match(html, /Word a ;: 0 of 2 letters matched\./);
  assert.match(html, /Type A or ; to attack/);
});

test("the Level 1-3 route does not leak Level 1-1's words", async () => {
  const html = await renderLevelRoute("1-3");

  assert.match(html, /Word s l: 0 of 2 letters matched\./);
  assert.match(html, /Type S or L to attack/);
  assert.doesNotMatch(html, /Word f j:/);
});

test("the number Level highlights the whole number row", async () => {
  const html = await renderLevelRoute("4-3");

  for (const digit of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]) {
    assert.match(html, trainedHighlight(digit), `digit ${digit} not highlighted`);
  }
});

test("the punctuation routes train the characters Worlds 4 types", async () => {
  const html = await renderLevelRoute("4-1");

  assert.match(html, trainedHighlight("."));
  assert.match(html, trainedHighlight(","));
  assert.match(html, /Word r u n \.: 0 of 4 letters matched\./);
});

test("every Level route keeps the mission card and keyboard structure", async () => {
  for (const level of [ALL_LEVELS[0], ALL_LEVELS[15], ALL_LEVELS[33]]) {
    const html = await renderLevelRoute(level.id);
    assert.match(html, /YOUR MISSION/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /On-screen keyboard/);
  }
});

test("an unknown Level id renders a not-found card instead of crashing", async () => {
  for (const id of ["99", "1"]) {
    const html = await renderLevelRoute(id);
    assert.match(html, /Level not found/);
    assert.doesNotMatch(html, /training-key/);
  }
});
