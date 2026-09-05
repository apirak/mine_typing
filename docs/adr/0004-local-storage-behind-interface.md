# Local progress stored in localStorage behind a GameStorage interface

**Status**: accepted (2026-09-05)

Phase 1 persistence (ticket #5) keeps all player progress and settings in the browser's `localStorage`, reached only through the `GameStorage` interface (`lib/game/storage.ts`): `loadProfile` / `saveProfile` / `saveLevelResult` / `loadLevelResults` (plan_a §12). Every record carries `id`, optional `userId`, `createdAt`, `updatedAt`, and `schemaVersion`, so Phase 2's Firestore can replace the Phase 1 implementation (`createLocalGameStorage`, whose backing is injectable and swapped for `window.localStorage` in the client binding) without touching gameplay or the store's consumers.

## Trade-offs accepted

- **Per-device only**: progress does not follow the player across browsers or machines until Firestore lands (Phase 2).
- **Best-effort writes**: a failed write (private mode, quota) never breaks a run; the game continues without persistence.
- **Forward-record guard**: a record whose `schemaVersion` is unknown is treated as absent rather than crashing, so writes from a future app version stay harmless.
- **No detailed history**: per-Level bests computed from saved runs suffice; IndexedDB play history stays out of scope per spec #2.

The interface seam was rejected as an afterthought late in Phase 2 — it exists from the first stored record, because retrofitting record metadata into existing storage is the cost this ADR avoids.
