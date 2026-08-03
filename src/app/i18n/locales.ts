import type { Locale as AntdLocale } from 'antd/es/locale';
import azAZ from 'antd/locale/az_AZ';
import ruRU from 'antd/locale/ru_RU';
import enUS from 'antd/locale/en_US';
import kaGE from 'antd/locale/ka_GE';
import arEG from 'antd/locale/ar_EG';
import 'dayjs/locale/az';
import 'dayjs/locale/ru';
import 'dayjs/locale/en';
import 'dayjs/locale/ka';
import 'dayjs/locale/ar';
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
  /** Ant Design component-text bundle (`antd/locale/*`). */
  antd: AntdLocale;
}

/**
 * Declaration order is display order in the language switchers, so the primary
 * market comes first.
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
    antd: arEG,
  },
};

/** Every supported locale, in switcher order. */
export const SUPPORTED_LOCALES = Object.keys(LOCALES) as Locale[];

/**
 * The locales a CV itself can be written in — `SUPPORTED_LOCALES` minus the ones
 * the exporter cannot render correctly yet (`LocaleMeta.cv`). Only the
 * CV-language select reads this; the UI switcher offers everything.
 */
export const CV_LOCALES = SUPPORTED_LOCALES.filter((code) => LOCALES[code].cv);

/**
 * First run starts in Azerbaijani — the primary market — and this is also the
 * fallback for any label a newer locale has not translated yet. Typed as the
 * literal (not widened to `Locale`) so `LocalizedText[DEFAULT_LOCALE]` is known
 * to be present.
 */
export const DEFAULT_LOCALE = 'az' satisfies Locale;

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
