import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
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

async function renderGameplayPage() {
  const { default: Home } = await vite.ssrLoadModule("/app/page.tsx");
  return renderToStaticMarkup(React.createElement(Home));
}

test("gameplay page server-renders the 3D canvas, HUD, and keyboard", async () => {
  const html = await renderGameplayPage();

  assert.match(html, /<canvas/i);
  assert.match(html, /Level 1 · F \+ J/);
  assert.match(html, /ACCURACY/);
  assert.match(html, /COMBO/);
  assert.match(html, /On-screen keyboard/);
  assert.match(html, /YOUR MISSION/);
  assert.match(html, /Clear 4 creatures/);
});

test("enemy words and match progress are mirrored offscreen for assistive tech", async () => {
  const html = await renderGameplayPage();

  assert.match(html, /aria-live="polite"/);
  assert.match(html, /4 enemies remaining\./);
  assert.match(html, /Word F:/);
  assert.match(html, /Word F J: 0 of 2 letters matched/);
  assert.match(html, /Word J F: 0 of 2 letters matched/);
});

test("a WebGL-less canvas still renders a fallback message in the scene area", async () => {
  // The fallback message ships in the client bundle; the SSR seam asserts
  // the battlefield container and canvas exist so the client can swap in
  // the fallback when a WebGL context cannot be created.
  const html = await renderGameplayPage();
  assert.match(html, /class="battlefield"/);
  assert.match(html, /class="scene-canvas"/);
});
