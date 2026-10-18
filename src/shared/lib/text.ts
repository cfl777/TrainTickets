/**
 * Locale-aware text comparison. Goals:
 *
 * - One definition of "the same name" for station matching (assumption 3):
 *   trimmed, then compared with Intl.Collator at base sensitivity, so case
 *   and accents are ignored and "enschede " equals "Enschedé".
 * - Exact match only: no prefix or fuzzy logic lives here or anywhere else.
 */

const baseCollator = new Intl.Collator(undefined, {
  sensitivity: "base",
  usage: "search",
});

/** True when the two strings are the same text after trimming, ignoring case and accents. */
export function isSameText(a: string, b: string): boolean {
  return baseCollator.compare(a.trim(), b.trim()) === 0;
}
