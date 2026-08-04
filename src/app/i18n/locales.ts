import type { Locale as AntdLocale } from 'antd/es/locale';
import azAZ from 'antd/locale/az_AZ';
import ruRU from 'antd/locale/ru_RU';
import enUS from 'antd/locale/en_US';
import kaGE from 'antd/locale/ka_GE';
import arEG from 'antd/locale/ar_EG';
import esES from 'antd/locale/es_ES';
import heIL from 'antd/locale/he_IL';
import koKR from 'antd/locale/ko_KR';
import 'dayjs/locale/az';
import 'dayjs/locale/ru';
import 'dayjs/locale/en';
import 'dayjs/locale/ka';
import 'dayjs/locale/ar';
import 'dayjs/locale/es';
import 'dayjs/locale/he';
import 'dayjs/locale/ko';
import type { Locale } from '../../types/resume';

/**
 * THE locale registry — the single place that knows which languages exist.
 *
 * Adding a language is a four-step, additive change (see
 * `docs/adding-a-language.md`):
 *   1. widen the `Locale` union in `types/resume.ts`,
 *   2. add `src/app/i18n/<code>.json` and register it in `./index.ts`,
 *   3. add one entry below (TypeScript will not compile until you do — `LOCALES`
 *      is a total `Record<Locale, …>`, so the union widening IS the checklist),
 *   4. optionally add the `<code>` column to `src/data/*.json`.
 *
 * Nothing else in the app hard-codes a language list: switchers, the AntD
 * `ConfigProvider`, dayjs, `document.lang`/`dir`, and dictionary lookups all
 * read from here, and dictionary/template labels fall back to `DEFAULT_LOCALE`
 * when a translation is missing rather than breaking the build.
 */

/** Writing direction. Right-to-left locales (fa, ar, he) need `rtl`. */
export type TextDirection = 'ltr' | 'rtl';

/**
 * The heading a language sits under in the picker.
 *
 * Assigned by where the language ORIGINATES, not by where it is spoken — English,
 * Spanish, Russian and Arabic are each spoken across several of these, so any
 * other rule would need a language to appear twice. The full set is declared
 * up front (with translations already in place) so adding a Japanese or a
 * Portuguese locale is one word here and no i18n work.
 */
export type LocaleRegion =
  'caucasusWestAsia' | 'europe' | 'middleEast' | 'asia' | 'americas' | 'pacific' | 'africa';

/**
 * Display order of the picker's groups. The default locale's own region leads,
 * for the same reason it leads `SUPPORTED_LOCALES` — it is the app's home market —
 * and the rest follow west-to-east-ish. A region with no languages in it is not
 * rendered, so listing all seven here costs nothing.
 */
export const REGION_ORDER: LocaleRegion[] = [
  'caucasusWestAsia',
  'europe',
  'middleEast',
  'asia',
  'americas',
  'pacific',
  'africa',
];

export interface LocaleMeta {
  /** Locale code; doubles as the i18next resource key and the dayjs locale name. */
  code: Locale;
  /** Short chip label in the header switcher. */
  short: string;
  /** Endonym — how speakers name their own language (CV-language select). */
  nativeName: string;
  dir: TextDirection;
  /**
   * Whether an abbreviated month name may be title-cased (`utils/date.ts` does
   * it so the CV reads the same in every language: "fev" → "Fev").
   *
   * False for scripts that have no title case. Georgian is the reason the flag
   * exists: Mkhedruli DOES have Unicode uppercase forms (Mtavruli, U+1C90–1CBF)
   * and `toLocaleUpperCase('ka')` will happily produce them, but Georgian
   * orthography uses Mtavruli only for whole words — "Თებ" is not a capitalized
   * month, it is a spelling error. Arabic, Farsi and Hebrew have no case at all.
   */
  capitalizeMonths: boolean;
  /**
   * Which digits the locale READS. `arab` renders `2026` as `٢٠٢٦` on the
   * finished CV (dates, age) — the convention in Arabic typesetting.
   *
   * Display only, and applied to already-formatted output: what is STORED stays
   * ISO in Western digits. dayjs's Arabic locale does the same rewriting inside
   * `.format()` itself, which would have reached `format('YYYY-MM-DD')` and
   * persisted `٢٠٢٦-٠٧-٣١` as a date of birth — `utils/date` turns that off and
   * localizes the digits here instead, where only display passes through.
   */
  digits: 'latn' | 'arab';
  /**
   * Whether the locale may also be chosen as the CV's OWN language
   * (`Resume.locale`), i.e. whether the EXPORT can be rendered in it. Separate
   * from the UI locale on purpose (spec §10.1) — translating the app is one
   * thing, producing a correct PDF in that language is another.
   *
   * Every shipped locale is exportable today. The flag exists because that is
   * not automatic: Arabic needed a font (`_core/fonts`), digit localization
   * (above) and a pre-shaping pass in `services/pdf.ts` before it could be
   * offered here, and it was `false` until all three were in place. A language
   * whose script the exporter cannot draw belongs in the UI switcher but not in
   * `CV_LOCALES`.
   */
  cv: boolean;
  /**
   * Which group the language picker files it under — see `LocaleRegion`. The flag
   * drawn beside it lives in `features/i18n/flags`, not here: this module is
   * imported by `vite-plugin-locale-pages.ts` and therefore has to stay free of
   * JSX and of anything browser-only.
   */
  region: LocaleRegion;
  /** Ant Design component-text bundle (`antd/locale/*`). */
  antd: AntdLocale;
}

/**
 * Declaration order is NOT display order — see `SUPPORTED_LOCALES` below, which
 * sorts them. Keeping the entries grouped by when they were added instead keeps
 * each one next to the comment explaining what it needed.
 */
export const LOCALES: Record<Locale, LocaleMeta> = {
  az: {
    code: 'az',
    short: 'AZ',
    nativeName: 'Azərbaycan',
    dir: 'ltr',
    capitalizeMonths: true,
    digits: 'latn',
    cv: true,
    region: 'caucasusWestAsia',
    antd: azAZ,
  },
  ru: {
    code: 'ru',
    short: 'RU',
    nativeName: 'Русский',
    dir: 'ltr',
    capitalizeMonths: true,
    digits: 'latn',
    cv: true,
    region: 'europe',
    antd: ruRU,
  },
  en: {
    code: 'en',
    short: 'EN',
    nativeName: 'English',
    dir: 'ltr',
    capitalizeMonths: true,
    digits: 'latn',
    cv: true,
    region: 'europe',
    antd: enUS,
  },
  /**
   * Georgian. The script is the first one Inter cannot draw, so it also needs a
   * font: `NotoSansGeorgian` is registered for the PDF in `services/pdf.ts` and
   * as a `unicode-range` `@font-face` for the UI in `index.css`. A locale in a
   * script neither font covers renders as blanks in the export — see
   * `docs/adding-a-language.md`.
   */
  ka: {
    code: 'ka',
    short: 'KA',
    nativeName: 'ქართული',
    dir: 'ltr',
    capitalizeMonths: false,
    digits: 'latn',
    cv: true,
    region: 'caucasusWestAsia',
    antd: kaGE,
  },
  /**
   * Arabic — the first right-to-left locale, so it is the first one where `dir`
   * does real work: AntD flips its components and `<html dir="rtl">` mirrors the
   * layout. Its font (`NotoSansArabic`) is registered exactly like the Georgian
   * one, and Arabic has no letter case at all, hence `capitalizeMonths: false`.
   *
   * It is also the first locale that needed work beyond a translation before it
   * could be EXPORTED (`cv`): the letters are joined by `utils/arabic` on the way
   * into the PDF, because react-pdf shapes a right-to-left line after it has
   * already reordered it — see that module, and `docs/adding-a-language.md`.
   */
  ar: {
    code: 'ar',
    short: 'AR',
    nativeName: 'العربية',
    dir: 'rtl',
    capitalizeMonths: false,
    digits: 'arab',
    cv: true,
    region: 'middleEast',
    antd: arEG,
  },
  /**
   * Spanish — the first locale that needed nothing but a translation: Latin
   * script, so Inter already covers every letter it uses (`á é í ó ú ü ñ ¿ ¡`,
   * verified against the shipped TTFs), and react-pdf draws it with no shaping or
   * digit work. Hence `cv: true` from the start.
   *
   * `capitalizeMonths: true` is a house-style call, not orthography: Spanish
   * writes month names in lower case, exactly as Russian does, and `ru` is already
   * title-cased here so a CV reads the same whichever language it is in. It is
   * safe in a way Georgian was not — upper-casing a Latin letter yields a Latin
   * capital, while `toLocaleUpperCase('ka')` produced Mtavruli, a different form.
   */
  es: {
    code: 'es',
    short: 'ES',
    nativeName: 'Español',
    dir: 'ltr',
    capitalizeMonths: true,
    digits: 'latn',
    cv: true,
    region: 'europe',
    antd: esES,
  },
  /**
   * Hebrew — right-to-left like Arabic, and it needs its own font
   * (`NotoSansHebrew`; Inter has not one of the 22 letters, verified with fontkit).
   *
   * But UNLIKE Arabic it needs no shaping pass: Hebrew letters have no contextual
   * initial/medial/final forms and no mandatory ligatures, so there is nothing for
   * `utils/arabic`'s equivalent to do — the only RTL machinery it relies on is the
   * bidi reordering in `@react-pdf/textkit`, which the shipped `patch-package` fix
   * already rewrote correctly. Its export is asserted end-to-end by the text
   * fidelity test rather than assumed, which is what `cv: true` rests on.
   *
   * `digits: 'latn'` — Hebrew has numerals of its own but writes dates in Western
   * ones. `capitalizeMonths: false` — the script is unicameral, like Arabic.
   */
  he: {
    code: 'he',
    short: 'HE',
    nativeName: 'עברית',
    dir: 'rtl',
    capitalizeMonths: false,
    digits: 'latn',
    cv: true,
    region: 'middleEast',
    antd: heIL,
  },
  /**
   * Korean — the first East Asian locale, and the first one whose script needs a
   * MEGABYTE-scale font rather than a 30 KB one: Hangul composes 11,172
   * precomposed syllables, none of which Inter has. `NanumGothic` covers all of
   * them (verified with fontkit) and is registered like the other script faces —
   * see `services/pdf.ts` for why the PDF gets a 2 MB TTF while the preview gets a
   * 340 KB woff2 of the same face.
   *
   * Cheap in every other respect, and for the reason Hebrew was: Hangul is drawn
   * from precomposed syllable code points, so there are no contextual forms and
   * nothing for a shaping pass to do. It is also left-to-right, so none of the RTL
   * machinery is involved either. `cv: true` rests on `text-fidelity.test.tsx`
   * recovering every Korean word from the exported PDF, not on that reasoning.
   *
   * `capitalizeMonths: false` — Hangul is unicameral, and dayjs's Korean months
   * are numerals anyway (`1월`), which have no case to change. `digits: 'latn'`:
   * Korean has native number words but writes dates in Western digits.
   */
  ko: {
    code: 'ko',
    short: 'KO',
    nativeName: '한국어',
    dir: 'ltr',
    capitalizeMonths: false,
    digits: 'latn',
    cv: true,
    region: 'asia',
    antd: koKR,
  },
};

/**
 * First run starts in Azerbaijani — the primary market — and this is also the
 * fallback for any label a newer locale has not translated yet. Typed as the
 * literal (not widened to `Locale`) so `LocalizedText[DEFAULT_LOCALE]` is known
 * to be present.
 */
export const DEFAULT_LOCALE = 'az' satisfies Locale;

/**
 * Every supported locale, in the order the switchers list them: the app's own
 * language first, then the rest alphabetically.
 *
 * A RULE, not the declaration order this used to take. Declaration order made
 * "where does a new language appear" an accident of when it was added — Spanish
 * appended itself after Arabic, and past three or four entries the list simply
 * reads as unsorted. The default locale stays pinned first because it is the app's
 * own language and the one most of its users want.
 *
 * Sorted on `short` rather than on `nativeName`: comparing across scripts has no
 * script-independent answer (`'العربية'.localeCompare('English')` depends on ICU
 * collation data), while the two-letter chips are ASCII and sort the same
 * everywhere. `CV_LOCALES` filters this list, so both selects agree.
 */
export const SUPPORTED_LOCALES = (Object.keys(LOCALES) as Locale[]).sort((a, b) => {
  if (a === b) return 0;
  if (a === DEFAULT_LOCALE) return -1;
  if (b === DEFAULT_LOCALE) return 1;
  return LOCALES[a].short.localeCompare(LOCALES[b].short);
});

/**
 * The locales a CV itself can be written in — `SUPPORTED_LOCALES` minus the ones
 * the exporter cannot render correctly yet (`LocaleMeta.cv`). Only the
 * CV-language select reads this; the UI switcher offers everything.
 */
export const CV_LOCALES = SUPPORTED_LOCALES.filter((code) => LOCALES[code].cv);

/** Type guard for untrusted locale values (persisted state, `i18n.language`). */
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LOCALES, value);
}

/**
 * Normalize anything locale-ish to a supported `Locale`: exact match first, then
 * the primary subtag (`ru-RU` → `ru`), then `DEFAULT_LOCALE`.
 */
export function toLocale(value: string | undefined | null): Locale {
  if (!value) return DEFAULT_LOCALE;
  if (isLocale(value)) return value;
  const primary = value.split('-')[0].toLowerCase();
  return isLocale(primary) ? primary : DEFAULT_LOCALE;
}
