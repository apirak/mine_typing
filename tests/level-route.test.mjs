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
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

const { default: LevelPage } = await vite.ssrLoadModule(
  "/app/level/[id]/page.tsx",
);
const { WORLD_ONE } = await vite.ssrLoadModule("/lib/game/levels.ts");

// The route page is an async server component; call it directly and render
// the element it resolves to (renderToStaticMarkup stays synchronous).
async function renderLevelRoute(id) {
  const element = await LevelPage({ params: Promise.resolve({ id }) });
  return renderToStaticMarkup(element);
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const trainedHighlight = (key) =>
  new RegExp(`<button data-key="${key}"[^>]*class="[^"]*training-key`);

for (const level of WORLD_ONE) {
  test(`route /level/${level.id} renders "${level.name}" with its trained keys highlighted`, async () => {
    const html = await renderLevelRoute(level.id);

    assert.match(html, new RegExp(escapeRegExp(level.name)));
    assert.match(html, new RegExp(escapeRegExp(level.worldLabel)));
    for (const key of level.trainedKeys) {
      assert.match(html, trainedHighlight(key), `key ${key} not highlighted`);
    }
    // An untrained key never carries the highlight.
    assert.doesNotMatch(html, /<button data-key="Q"[^>]*training-key/);
    // The hint line teaches each trained key's finger.
    for (const key of level.trainedKeys) {
      assert.match(html, new RegExp(escapeRegExp(`<kbd>${key}</kbd>`)));
    }
  });
}

test("each Level route server-renders that Level's own words and ready feedback", async () => {
  const html = await renderLevelRoute("4");

  assert.match(html, /4 enemies remaining\./);
  assert.match(html, /Word A ;: 0 of 2 letters matched\./);
  assert.match(html, /Word ;: 0 of 1 letter matched\./);
  assert.match(html, /Type A or ; to attack/);
});

test("the Level 3 route does not leak Level 1's words", async () => {
  const html = await renderLevelRoute("3");

  assert.match(html, /Word S L: 0 of 2 letters matched\./);
  assert.match(html, /Type S or L to attack/);
  assert.doesNotMatch(html, /Word F J:/);
});

test("every Level route keeps the mission card and keyboard structure", async () => {
  for (const level of WORLD_ONE) {
    const html = await renderLevelRoute(level.id);
    assert.match(html, /YOUR MISSION/);
    assert.match(html, /Clear 4 creatures/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /On-screen keyboard/);
  }
});

test("an unknown Level id renders a not-found card instead of crashing", async () => {
  const html = await renderLevelRoute("99");

  assert.match(html, /Level not found/);
  assert.doesNotMatch(html, /training-key/);
});
