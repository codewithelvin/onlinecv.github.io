/**
 * Shared validation patterns (spec §16). Centralized so forms and tests share
 * one source of truth.
 */

/** Letters (Latin + Azerbaijani + Cyrillic) and spaces only — inherited quirk: rejects hyphens/apostrophes. */
export const LETTERS_AND_SPACE = /^[a-zA-ZəƏğĞıIiİöÖüÜşŞçÇЀ-ӿ\s]+$/;

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
