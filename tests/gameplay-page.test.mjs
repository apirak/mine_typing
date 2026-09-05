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

// app/page.tsx is the Home screen since ticket #6; the gameplay page test
// moved with it — the route under test is now /level/1.

async function renderGameplayPage() {
  const { default: LevelPage } = await vite.ssrLoadModule(
    "/app/level/[id]/page.tsx",
  );
  const element = await LevelPage({ params: Promise.resolve({ id: "1" }) });
  return renderToStaticMarkup(element);
}

async function renderPauseCard(props) {
  const { PauseCard } = await vite.ssrLoadModule(
    "/components/game/pause-card.tsx",
  );
  return renderToStaticMarkup(
    React.createElement(PauseCard, {
      onContinue: () => {},
      onRestart: () => {},
      ...props,
    }),
  );
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

test("the pause card interrupts a live run with continue and restart", async () => {
  const html = await renderPauseCard({});

  assert.match(html, /GAME PAUSED/);
  assert.match(html, /Continue/);
  assert.match(html, /Restart level/);
  // The run's outcome lives on the Result screen now.
  assert.doesNotMatch(html, /GAME OVER/);
  assert.doesNotMatch(html, /Level cleared!/);
});
