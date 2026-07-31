import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { i18n } from './index';
import { DEFAULT_LOCALE, LOCALES, SUPPORTED_LOCALES, isLocale, toLocale } from './locales';

/**
 * The "adding a language" contract (`docs/adding-a-language.md`).
 *
 * `LOCALES` being a total `Record<Locale, …>` makes the COMPILER list the steps,
 * but three of them it cannot check: that the translation bundle was registered
 * with i18next, that it holds the same keys as the default locale, and that the
 * dayjs data was imported. Each one fails silently at runtime — a missing key
 * quietly falls back to Azerbaijani, missing dayjs data quietly formats dates in
 * English — so they are asserted here instead.
 */

/** Every leaf key in a bundle, as dot paths. */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

function bundle(locale: string): Record<string, unknown> {
  return i18n.getResourceBundle(locale, 'translation') as Record<string, unknown>;
}

describe('locale registry', () => {
  it('registers a translation bundle for every supported locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(bundle(locale), `no i18next bundle for "${locale}"`).toBeTruthy();
    }
  });

  /**
   * i18next falls back key-by-key, so a bundle missing half its keys renders a
   * half-Azerbaijani UI rather than failing — which is exactly the kind of thing
   * nobody notices in a language they do not read.
   */
  it('gives every locale the same keys as the default one', () => {
    const expected = keyPaths(bundle(DEFAULT_LOCALE)).sort();
    expect(expected.length).toBeGreaterThan(100);

    for (const locale of SUPPORTED_LOCALES.filter((l) => l !== DEFAULT_LOCALE)) {
      const actual = keyPaths(bundle(locale)).sort();
      expect(actual.filter((k) => !expected.includes(k)), `"${locale}" has extra keys`).toEqual([]);
      expect(
        expected.filter((k) => !actual.includes(k)),
        `"${locale}" is missing keys`,
      ).toEqual([]);
    }
  });

  it('never leaves a translated value empty', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const empty = keyPaths(bundle(locale)).filter(
        (path) => String(i18n.getFixedT(locale)(path)).trim() === '',
      );
      expect(empty, `"${locale}" has empty strings`).toEqual([]);
    }
  });

  it('loads the dayjs data for every supported locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      // `dayjs.locale(x)` silently keeps the previous locale when `x` was never
      // imported, so compare what it actually switched to.
      expect(dayjs().locale(locale).locale(), `dayjs has no data for "${locale}"`).toBe(locale);
    }
  });

  it('describes every locale with a short chip, an endonym and a direction', () => {
    const shorts = new Set<string>();
    for (const locale of SUPPORTED_LOCALES) {
      const meta = LOCALES[locale];
      expect(meta.code).toBe(locale);
      expect(meta.short, `"${locale}" has no chip label`).toMatch(/^\S+$/);
      expect(meta.nativeName.trim(), `"${locale}" has no endonym`).not.toBe('');
      expect(['ltr', 'rtl']).toContain(meta.dir);
      // The AntD bundle, not a placeholder — it names its own locale.
      expect(meta.antd.locale, `"${locale}" has no AntD locale`).toBeTruthy();
      expect(shorts.has(meta.short), `"${meta.short}" is used twice`).toBe(false);
      shorts.add(meta.short);
    }
  });

  it('normalizes locale-ish values', () => {
    expect(toLocale('ka-GE')).toBe('ka');
    // Case-insensitive: a persisted value is untrusted input, and "KA" means
    // Georgian by any reading.
    expect(toLocale('KA')).toBe('ka');
    expect(toLocale('xx')).toBe(DEFAULT_LOCALE);
    expect(toLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(isLocale('ka')).toBe(true);
    expect(isLocale('xx')).toBe(false);
  });
});
