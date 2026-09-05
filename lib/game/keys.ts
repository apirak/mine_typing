// Pure KeyboardEvent normalization. The game reads what the player
// actually typed — `key` — and never reinterprets it through the
// physical key's identity: a non-English input source is the player's
// setup to fix (the screen raises a "switch to English" note), not the
// game's to guess around. No React, no DOM: callers hand in the two
// event fields the game needs, so this stays assertable from node:test.

/**
 * The typed game key — "A" through "Z", or the home-row semicolon — or
 * null when the input is anything else, including non-Latin characters
 * from another input source.
 */
export function typedKeyFromEvent(event: { key: string; code?: string }): string | null {
  if (event.key === ";") return ";";
  const key = event.key.toUpperCase();
  return /^[A-Z]$/.test(key) ? key : null;
}

/**
 * True when the player pressed a letter position but their input source
 * typed something that is not an English letter — Thai and other
 * non-Latin layouts, dead keys, modifier-mangled accents. Modifiers,
 * digits, and navigation keys never raise it: they are not attempts at
 * a letter.
 */
export function isForeignLetterEvent(event: { key: string; code: string }): boolean {
  if (!/^Key[A-Z]$/.test(event.code)) return false;
  if (event.key === ";") return false;
  return !/^[A-Za-z]$/.test(event.key);
}
