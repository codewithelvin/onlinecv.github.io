import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { applyLocale, i18n } from './index';
import {
  CV_LOCALES,
  DEFAULT_LOCALE,
  LOCALES,
  SUPPORTED_LOCALES,
  isLocale,
  toLocale,
} from './locales';

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
      expect(
        actual.filter((k) => !expected.includes(k)),
        `"${locale}" has extra keys`,
      ).toEqual([]);
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

  /**
   * The switchers list `SUPPORTED_LOCALES` as-is, so its order IS the menu order.
   * It used to be the order the entries happened to be declared in, which meant a
   * new language appeared wherever it was appended — Spanish landed after Arabic
   * and the list read as unsorted. Asserted as the rule rather than as a fixed
   * list, so the next language sorts itself into place.
   */
  it('lists the default locale first and the rest alphabetically', () => {
    expect(SUPPORTED_LOCALES[0], 'the app’s own language comes first').toBe(DEFAULT_LOCALE);

    const rest = SUPPORTED_LOCALES.slice(1).map((code) => LOCALES[code].short);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)));
    // Every locale still present — sorting must not drop or duplicate one.
    expect(new Set(SUPPORTED_LOCALES).size).toBe(Object.keys(LOCALES).length);
    // The CV-language select filters the same list, so the two agree.
    expect(CV_LOCALES).toEqual(SUPPORTED_LOCALES.filter((code) => LOCALES[code].cv));
  });

  /**
   * A locale can be translated for the UI before the exporter can render a CV in
   * it. `CV_LOCALES` is that distinction, and it only ever narrows: the default
   * locale must stay exportable, or the app's own first-run CV is unbuildable.
   */
  it('offers a subset of the UI languages as CV languages, always including the default', () => {
    expect(CV_LOCALES.every((code) => SUPPORTED_LOCALES.includes(code))).toBe(true);
    expect(CV_LOCALES).toContain(DEFAULT_LOCALE);
    for (const locale of SUPPORTED_LOCALES) {
      expect(typeof LOCALES[locale].cv, `"${locale}" does not declare \`cv\``).toBe('boolean');
    }
  });

  /**
   * Arabic is the app's first right-to-left locale, its first unicameral-plus-
   * RTL script, and the first with numerals of its own. It is exportable — the
   * letters are joined on the way into the PDF by `utils/arabic`, since
   * react-pdf shapes an RTL line only after reordering it.
   */
  it('describes Arabic as right-to-left, uncased, Arabic-numeralled and exportable', () => {
    expect(SUPPORTED_LOCALES).toContain('ar');
    expect(LOCALES.ar.dir).toBe('rtl');
    expect(LOCALES.ar.capitalizeMonths, 'Arabic has no letter case').toBe(false);
    expect(LOCALES.ar.digits).toBe('arab');
    expect(CV_LOCALES).toContain('ar');
  });

  /** Everything else reads Western digits — the flag is not a free-for-all. */
  it('leaves the other locales on Western digits', () => {
    for (const locale of SUPPORTED_LOCALES.filter((l) => l !== 'ar')) {
      expect(LOCALES[locale].digits, `"${locale}" changed its numerals`).toBe('latn');
    }
  });

  /**
   * `applyLocale` is what an RTL locale actually costs: AntD reads the direction
   * from `LOCALES` reactively, but the document attributes are imperative, and
   * `<html dir>` is what mirrors the page itself.
   */
  it('writes lang and dir onto the document when the locale changes', () => {
    applyLocale('ar');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    applyLocale(DEFAULT_LOCALE);
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
  });

  /**
   * A right-to-left sentence that quotes a phone number in international format
   * draws its `+` at the wrong end. `+` is a bidi-neutral character, so between
   * Arabic text and the digits it resolves right-to-left and lands AFTER the
   * number, which is the very format the message is trying to teach. A
   * LEFT-TO-RIGHT MARK (U+200E) in front of it turns the digits left-to-right
   * (rule W7) and pulls the sign into the same run.
   *
   * Form controls solve this with `dir="auto"` (`utils/bidi`); a translated
   * string is not a control, so it carries the mark itself. Checked as a rule so
   * the next RTL locale cannot ship without it.
   */
  it('isolates a quoted phone format in every right-to-left locale', () => {
    const rtl = SUPPORTED_LOCALES.filter((locale) => LOCALES[locale].dir === 'rtl');
    expect(rtl.length, 'no right-to-left locale to check').toBeGreaterThan(0);

    for (const locale of rtl) {
      const t = i18n.getFixedT(locale);
      for (const path of keyPaths(bundle(locale))) {
        const value = String(t(path));
        const at = value.search(/\+\d/);
        if (at === -1) continue;
        expect(
          value.slice(Math.max(0, at - 1), at),
          `"${locale}" ${path} quotes "+" without a U+200E in front of it`,
        ).toBe('\u200E');
      }
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

/**
 * The CV prints an age as `<number> <unit>`, and in Russian and Polish the unit
 * changes WITH the number inside the ordinary 16–100 range a CV can hold:
 * "21 год", "22 года", "25 лет". A single fixed string — which is what shipped
 * until 2026-09-03 — was wrong for about a third of those ages.
 *
 * `generalInfoPairs` therefore passes `count`, and i18next resolves the CLDR
 * plural category of the CV's own locale. What that needs from the bundles is a
 * form for every category the locale can produce, which no compiler can check:
 * a missing one renders the raw key `common.years` on the finished CV.
 */
describe('the age unit agrees with its number', () => {
  const unit = (locale: string, count: number) =>
    String(i18n.getFixedT(locale)('common.years', { count }));

  it('inflects in Russian', () => {
    expect(unit('ru', 21)).toBe('год');
    expect(unit('ru', 22)).toBe('года');
    expect(unit('ru', 24)).toBe('года');
    expect(unit('ru', 25)).toBe('лет');
    expect(unit('ru', 16)).toBe('лет');
    expect(unit('ru', 100)).toBe('лет');
  });

  it('inflects in Polish', () => {
    expect(unit('pl', 22)).toBe('lata');
    expect(unit('pl', 34)).toBe('lata');
    expect(unit('pl', 25)).toBe('lat');
    expect(unit('pl', 16)).toBe('lat');
  });

  /** Hebrew counts 11 and up with the SINGULAR, so the whole range is `שנה`. */
  it('keeps Hebrew singular, which is what this range always wants', () => {
    for (const age of [16, 20, 34, 100]) expect(unit('he', age), `he @ ${age}`).toBe('שנה');
  });

  it('leaves the uninflecting languages alone', () => {
    const fixed: Array<[string, string]> = [
      ['tr', 'yaşında'],
      ['ja', '歳'],
      ['ko', '세'],
      ['zh', '岁'],
      ['ka', 'წლის'],
      ['kk', 'жаста'],
      ['el', 'ετών'],
      ['az', 'yaş'],
    ];
    for (const [locale, expected] of fixed) {
      for (const age of [16, 21, 22, 25, 100]) {
        expect(unit(locale, age), `${locale} @ ${age}`).toBe(expected);
      }
    }
  });

  /**
   * The guard that matters: no locale may fall through to the unresolved key at
   * ANY age the app can compute (`calcAge` is bounded by the 16–100 yup rule).
   */
  it('resolves a real word for every locale at every age a CV can hold', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (let age = 16; age <= 100; age += 1) {
        const value = unit(locale, age);
        expect(value, `${locale} @ ${age} fell through to the key`).not.toContain('common.years');
        expect(value.trim(), `${locale} @ ${age} is empty`).not.toBe('');
      }
    }
  });
});
