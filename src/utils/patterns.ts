/**
 * Shared validation patterns (spec §16). Centralized so forms and tests share
 * one source of truth.
 */

/**
 * A person's name (spec §16 `onlyAzLatRusLettersAndSpace`, widened).
 *
 * `\p{L}` accepts letters from ANY script, which is the point: the original
 * allow-list was Latin + Azerbaijani + Cyrillic only, so the app shipped UI
 * languages whose speakers could not type their own name — an Arabic or
 * Georgian user got "only letters and spaces" on a perfectly valid name. Any
 * future locale is covered for free, the same way `LOCALES` covers the rest of
 * the app.
 *
 * `\p{M}` allows combining marks (Arabic harakat, Latin/Cyrillic diacritics),
 * which are part of the letter rather than punctuation.
 *
 * Space, hyphen and apostrophe are allowed too — "Əli-zadə", "O'Brien" and
 * "Van der Meer" are names, not typos. The source app rejected all three; that
 * was a bug of the same kind as the script restriction, not a rule worth
 * keeping. Digits and other punctuation stay rejected, and the first character
 * must be a letter, so "---" or "'x" cannot pass.
 */
export const PERSON_NAME = /^\p{L}[\p{L}\p{M}\s'’-]*$/u;

/** E.164 phone (replaces the source's AZ-only 9-digit regex). */
export const E164_PHONE = /^\+[1-9]\d{7,14}$/;

/** Per-platform profile URL patterns. */
export const PROFILE_URL: Record<'linkedin' | 'facebook' | 'github' | 'instagram' | 'x', RegExp> = {
  linkedin: /^https?:\/\/(www\.)?linkedin\.com\/.+$/i,
  facebook: /^https?:\/\/(www\.)?(facebook|m\.facebook)\.com\/.+$/i,
  github: /^https?:\/\/(www\.)?github\.com\/.+$/i,
  instagram: /^https?:\/\/(www\.)?instagram\.com\/.+$/i,
  x: /^https?:\/\/(www\.)?(x|twitter)\.com\/.+$/i,
};
