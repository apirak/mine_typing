// Pure KeyboardEvent normalization. Turns one physical key event into the
// game's keyspace — "A" through "Z", or the home-row semicolon — or null
// when the key is outside it. No React, no DOM: callers hand in the two
// event fields the game needs, so this stays assertable from node:test.

/** KeyboardEvent.code → game key for codes that don't fit the Key<X> pattern. */
const CODE_KEYS: Record<string, string> = { Semicolon: ";" };

/**
 * Resolve the typed game key. `key` wins when it already names a game key
 * (a Latin input source, any case). Otherwise the active input source is
 * typing layout characters — Thai and other non-Latin layouts, dead keys,
 * modifier-mangled accents — and touch typing keys by position, so fall
 * back to `code`, the physical key's identity, which never changes with
 * the layout.
 */
export function typedKeyFromEvent(event: { key: string; code: string }): string | null {
  if (event.key === ";") return ";";
  const key = event.key.toUpperCase();
  if (/^[A-Z]$/.test(key)) return key;

  const byLetter = /^Key([A-Z])$/.exec(event.code);
  if (byLetter) return byLetter[1];
  return CODE_KEYS[event.code] ?? null;
}
