import { describe, expect, it } from 'vitest';
import {
  ALL_CONTACT_TYPES,
  CONTACT_TYPES,
  contactTypeChoices,
  LICENSE_CATEGORIES,
  normalizeLicenseCategories,
  RETIRED_CONTACT_TYPES,
} from './enums';

/**
 * A retired channel is one the app stops OFFERING without dropping — see
 * `RETIRED_CONTACT_TYPES` for why Skype is one.
 *
 * The pair of assertions is the whole contract: gone from the picker, still
 * usable by the resume that already has it. Getting only the first half right is
 * the easy mistake, and it turns a stored contact into an unlabelled row the user
 * cannot fix.
 */
describe('retired contact channels', () => {
  it('does not offer a retired channel when adding a contact', () => {
    expect(RETIRED_CONTACT_TYPES.length).toBeGreaterThan(0);
    for (const type of RETIRED_CONTACT_TYPES) {
      expect(CONTACT_TYPES).not.toContain(type);
    }
  });

  it('offers it again to the item that already uses it', () => {
    for (const type of RETIRED_CONTACT_TYPES) {
      expect(contactTypeChoices(type)).toContain(type);
      // …and to nothing else: a different item must not see it come back.
      expect(contactTypeChoices('mobile')).not.toContain(type);
    }
  });

  /** Retiring is not deleting: the model still carries the channel. */
  it('keeps the channel in the model', () => {
    for (const type of RETIRED_CONTACT_TYPES) {
      expect(ALL_CONTACT_TYPES).toContain(type);
    }
  });
});

/**
 * Driver-licence categories are SUGGESTIONS, not an enum: they differ by issuing
 * country (see `GeneralInfo.driverLicense`), so the field takes free text and
 * these are the only guards left on what reaches the CV.
 */
describe('normalizeLicenseCategories', () => {
  it('keeps the shipped Azerbaijani categories untouched', () => {
    expect(normalizeLicenseCategories([...LICENSE_CATEGORIES])).toEqual([...LICENSE_CATEGORIES]);
  });

  /** The whole point of the change: a licence from another country. */
  it('accepts categories no country in the shipped list uses', () => {
    // Russia's tram/trolleybus/moped classes, the EU's, Israel's.
    const foreign = ['M', 'Tm', 'Tb', 'C1E', 'D1E', 'AM', 'A2', 'D2', 'D3'];
    expect(normalizeLicenseCategories(foreign)).toEqual(foreign);
  });

  it('keeps a non-Latin class name, since not every country uses letters', () => {
    expect(normalizeLicenseCategories(['رخصة خاصة'])).toEqual(['رخصة خاصة']);
  });

  it('trims and collapses whitespace', () => {
    expect(normalizeLicenseCategories(['  B ', 'C\t1'])).toEqual(['B', 'C 1']);
  });

  it('drops blanks', () => {
    expect(normalizeLicenseCategories(['B', '   ', ''])).toEqual(['B']);
  });

  /** A duplicate would print twice on the CV, and case must not hide it. */
  it('de-duplicates case-insensitively, keeping what was typed first', () => {
    expect(normalizeLicenseCategories(['B', 'b', 'BE', 'be'])).toEqual(['B', 'BE']);
  });

  /**
   * Case is deliberately preserved rather than upper-cased: `Tm`/`Tb` are
   * officially mixed case, so "tidying" them would be wrong.
   */
  it('never changes the case of what was typed', () => {
    expect(normalizeLicenseCategories(['Tm', 'Tb'])).toEqual(['Tm', 'Tb']);
  });

  it('bounds a single entry and the total count', () => {
    expect(normalizeLicenseCategories(['x'.repeat(50)])[0]).toHaveLength(20);
    const many = Array.from({ length: 40 }, (_, i) => `X${i}`);
    expect(normalizeLicenseCategories(many)).toHaveLength(15);
  });
});
