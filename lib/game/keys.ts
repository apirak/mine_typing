// Pure KeyboardEvent normalization. The game reads what the player
// actually typed — `key` — and never reinterprets it through the
// physical key's identity: a non-English input source is the player's
// setup to fix (the screen raises a "switch to English" note), not the
// game's to guess around. No React, no DOM: callers hand in the two
// event fields the game needs, so this stays assertable from node:test.

/**
 * Every matchable game key: letters in both cases, digits, `. , ! ? '`,
 * and the home-row semicolon. The one spelling of the keyspace — matching
 * validates against it too, so a curriculum key change lands once.
 */
export const GAME_KEY_PATTERN = /^[a-zA-Z0-9.,;!?']$/;

/**
 * The typed game key — a lowercase or Shift-capital letter, a digit,
 * one of `. , ! ? '`, or the home-row semicolon — or null for anything
 * else, including non-Latin characters from another input source. The
 * case is preserved: a Shift capital is its own key, so Words with
 * capitals match case-sensitively (spec #15). Menu shortcuts decide
 * their own case policy by folding the result themselves.
 */
export function typedKeyFromEvent(event: { key: string; code?: string }): string | null {
  const key = event.key;
  if (key === ";") return ";";
  return /^[a-zA-Z0-9.,!?']$/.test(key) ? key : null;
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
