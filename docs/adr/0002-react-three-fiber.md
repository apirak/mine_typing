# React Three Fiber for the 3D gameplay scene

**Status**: accepted (2026-09-04)

With true 3D rendering decided ([ADR 0001](./0001-true-3d-rendering.md)), we chose React Three Fiber (v9, React 19 compatible) + drei over vanilla Three.js and Babylon.js. The app is already React (Next/vinext), and this milestone's scene is a view over shared state, so the scene being declarative React components keeps one paradigm. Vanilla Three.js was rejected (imperative bridge between two rendering paradigms for no gain at this scope); Babylon.js was rejected (engine surface and bundle size a typing game doesn't need).
