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

// The screens' storage-derived facts (locks, bests, stars) ride props on
// presentational components (ADR 0004 / the OutcomeCard pattern), so the
// SSR seam asserts what a player sees for a provided profile.

async function renderHome() {
  const { default: Home } = await vite.ssrLoadModule("/app/page.tsx");
  return renderToStaticMarkup(React.createElement(Home));
}

async function renderLevelSelect(props) {
  const { LevelSelect } = await vite.ssrLoadModule(
    "/components/game/level-select.tsx",
  );
  const { WORLD_ONE } = await vite.ssrLoadModule("/lib/game/levels.ts");
  return renderToStaticMarkup(
    React.createElement(LevelSelect, { levels: WORLD_ONE, ...props }),
  );
}

async function renderSettings() {
  const { default: SettingsPage } = await vite.ssrLoadModule(
    "/app/settings/page.tsx",
  );
  return renderToStaticMarkup(React.createElement(SettingsPage));
}

async function renderResultCard(props) {
  const { ResultCard } = await vite.ssrLoadModule(
    "/components/game/result-card.tsx",
  );
  const { WORLD_ONE } = await vite.ssrLoadModule("/lib/game/levels.ts");
  return renderToStaticMarkup(
    React.createElement(ResultCard, {
      level: WORLD_ONE[0],
      defeated: false,
      stats: { accuracy: 96, hits: 48, misses: 2, bestCombo: 18, elapsedSeconds: 33 },
      stars: 3,
      hasNext: true,
      onRetry: () => {},
      onSelect: () => {},
      onNext: () => {},
      ...props,
    }),
  );
}

async function renderResultRoute(id) {
  const { default: ResultPage } = await vite.ssrLoadModule(
    "/app/level/[id]/result/page.tsx",
  );
  const element = await ResultPage({ params: Promise.resolve({ id }) });
  return renderToStaticMarkup(element);
}

test("the Home route shows the game title, Play, and Settings entries", async () => {
  const html = await renderHome();

  assert.match(html, /VOXEL TYPING/);
  assert.match(html, /PLAY/);
  assert.match(html, /SETTINGS/);
});

test("the Home route exposes the sound and music quick toggles", async () => {
  const html = await renderHome();

  assert.match(html, /Mute sound/);
  assert.match(html, /Toggle music/);
});

test("Level Select lists every World 1 Level with its trained keys", async () => {
  const html = await renderLevelSelect({ progress: {} });

  assert.match(html, /Level 1 · F \+ J/);
  assert.match(html, /Level 5 · G \+ H/);
  assert.match(html, /F/);
  assert.match(html, /G \+ H/);
});

test("a fresh profile unlocks only the first Level", async () => {
  const html = await renderLevelSelect({ progress: {} });

  assert.match(html, /level-card[^"]*available/);
  assert.match(html, /Locked/);
  assert.match(html, /aria-disabled="true"/);
});

test("a provided profile shows completed Levels with best accuracy and stars", async () => {
  const html = await renderLevelSelect({
    progress: {
      "1": { best: { accuracy: 98, combo: 12 }, stars: 3 },
      "2": { best: { accuracy: 91, combo: 7 }, stars: 2 },
    },
  });

  assert.match(html, /98%/);
  assert.match(html, /91%/);
  assert.match(html, /★★★/);
  assert.match(html, /★★/);
  // With Level 2 completed, Level 3 is the available frontier.
  const card3 = html.match(/<button[^>]*data-level-id="3"[^>]*>/)[0];
  assert.match(card3, /available/);
  const card4 = html.match(/<button[^>]*data-level-id="4"[^>]*>/)[0];
  assert.match(card4, /locked/);
});

test("the Settings route exposes every persisted control", async () => {
  const html = await renderSettings();

  assert.match(html, /Music/);
  assert.match(html, /Sound effects/);
  assert.match(html, /Volume/);
  assert.match(html, /type="range"/);
  assert.match(html, /Show virtual keyboard/);
  assert.match(html, /Reduced motion/);
  assert.match(html, /Reset progress/);
});

test("a cleared Level shows its stats, stars, and the Retry, Select, and Next actions", async () => {
  const html = await renderResultCard({});

  assert.match(html, /LEVEL COMPLETE/);
  assert.match(html, /★★★/);
  assert.match(html, /96%/);
  assert.match(html, /48/);
  assert.match(html, /2/);
  assert.match(html, /87 CPM/);
  assert.match(html, /×18/);
  assert.match(html, /RETRY/);
  assert.match(html, /LEVEL SELECT/);
  assert.match(html, /NEXT/);
});

test("a run below the time target's accuracy gates keeps its second star", async () => {
  const html = await renderResultCard({
    stats: { accuracy: 91, hits: 30, misses: 3, bestCombo: 9, elapsedSeconds: 52 },
    stars: 2,
  });

  assert.match(html, /★★/);
  assert.doesNotMatch(html, /★★★/);
});

test("the last Level's Result offers no Next", async () => {
  const html = await renderResultCard({ hasNext: false });

  assert.match(html, /RETRY/);
  assert.doesNotMatch(html, /NEXT/);
});

test("Game Over is a defeat variant of Result with Retry and no stars", async () => {
  const html = await renderResultCard({
    defeated: true,
    stars: 0,
    stats: { accuracy: 40, hits: 4, misses: 6, bestCombo: 2, elapsedSeconds: 12 },
  });

  assert.match(html, /GAME OVER/);
  assert.match(html, /RETRY/);
  assert.doesNotMatch(html, /NEXT/);
  assert.doesNotMatch(html, /★★★/);
  assert.match(html, /☆☆☆/);
});

test("the Result route renders the cleared Level's structure", async () => {
  const html = await renderResultRoute("1");

  assert.match(html, /aria-label="Result/);
  assert.match(html, /Level 1 · F \+ J/);
});

test("the Result route for an unknown Level renders a not-found card", async () => {
  const html = await renderResultRoute("99");

  assert.match(html, /Level not found/);
});
