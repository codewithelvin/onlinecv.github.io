import type { Locale as AntdLocale } from 'antd/es/locale';
import azAZ from 'antd/locale/az_AZ';
import ruRU from 'antd/locale/ru_RU';
import enUS from 'antd/locale/en_US';
import kaGE from 'antd/locale/ka_GE';
import arEG from 'antd/locale/ar_EG';
import esES from 'antd/locale/es_ES';
import heIL from 'antd/locale/he_IL';
import koKR from 'antd/locale/ko_KR';
import zhCN from 'antd/locale/zh_CN';
import frFR from 'antd/locale/fr_FR';
import deDE from 'antd/locale/de_DE';
import itIT from 'antd/locale/it_IT';
import trTR from 'antd/locale/tr_TR';
import ptPT from 'antd/locale/pt_PT';
import plPL from 'antd/locale/pl_PL';
import huHU from 'antd/locale/hu_HU';
import elGR from 'antd/locale/el_GR';
import kkKZ from 'antd/locale/kk_KZ';
import uzUZ from 'antd/locale/uz_UZ';
import jaJP from 'antd/locale/ja_JP';
import dayjs from 'dayjs';
import 'dayjs/locale/az';
import 'dayjs/locale/ru';
import 'dayjs/locale/en';
import 'dayjs/locale/ka';
import 'dayjs/locale/ar';
import 'dayjs/locale/es';
import 'dayjs/locale/he';
import 'dayjs/locale/ko';
/**
 * `zh`, not `zh-cn`, so `LocaleMeta.code` keeps doubling as the dayjs locale name
 * (`applyLocale` passes it straight to `dayjs.locale`). Checked rather than
 * assumed: dayjs's `zh` and `zh-cn` data are identical in every field this app
 * reads — the same simplified month, short-month and weekday names, `weekStart: 1`
 * and no `preparse`/`postformat` — so the shorter name costs nothing.
 */
import 'dayjs/locale/zh';
import 'dayjs/locale/fr';
import 'dayjs/locale/de';
import 'dayjs/locale/it';
import 'dayjs/locale/tr';
import 'dayjs/locale/pt';
import 'dayjs/locale/pl';
import 'dayjs/locale/hu';
import 'dayjs/locale/el';
import 'dayjs/locale/kk';
import 'dayjs/locale/ja';
import uzLatn from 'dayjs/locale/uz-latn';
import type { Locale } from '../../types/resume';

/**
 * dayjs ships Uzbek in TWO scripts under two DIFFERENT keys — `uz` is
 * Cyrillic, `uz-latn` is Latin — and Latin is the script this app's own `uz`
 * translation is written in (Uzbekistan's current official script; antd's
 * `uz_UZ` bundle agrees, its own `locale` field reading `uz-latn`).
 *
 * `LocaleMeta.code` doubles as the dayjs locale name everywhere else in this
 * file (`applyLocale`/`makeDateFormatter` call `dayjs.locale(code)` directly),
 * so without this, `dayjs.locale('uz')` would resolve to dayjs's default
 * Cyrillic data — a date picker showing Cyrillic month names inside an
 * otherwise Latin UI. Re-registering the Latin config under the plain `uz`
 * key (dayjs's own API for "register a locale object under this name") fixes
 * that at the source, so every later call in this module needs to know
 * nothing about it.
 */
dayjs.locale({ ...uzLatn, name: 'uz' }, undefined, true);

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

/**
 * The dayjs patterns a locale writes DATES with on the finished CV.
 *
 * Spec §10.2 used to name one pair of formats for every language, which was
 * right until the app reached a language that orders a date differently rather
 * than merely spelling its months differently. Korean writes `2014년 9월` and
 * `1987.06.15`, Chinese `2009年9月` — big-endian, unit-marked — where the app-wide
 * `MMM YYYY` / `DD.MM.YYYY` produced `9월 2014` and `15.06.1987`: readable, but
 * visibly foreign on a CV whose whole purpose is to look native to its reader.
 *
 * A locale's own patterns therefore live here, beside everything else that is a
 * property OF the language. `utils/date` resolves them, so no caller — template,
 * editor summary or export — has to know a table exists.
 *
 * INPUT is deliberately not covered: the AntD pickers keep `DD.MM.YYYY` in every
 * locale, because a placeholder is something the user retypes and the parser has
 * to accept exactly what it advertises. Formatting for the eye and formatting for
 * the keyboard are two different things, the same split `localizeDigits` makes.
 */
export interface DateFormats {
  /** Work experience + date of birth. */
  full: string;
  /** Education + certificates — month precision, localized month. */
  monthYear: string;
}

/**
 * The little-endian, dot-separated pair used by every locale that has no
 * convention of its own here — Azerbaijani through Uzbek. Named so the two
 * East Asian entries below stand out as the deliberate exceptions they are.
 */
const WESTERN_DATES: DateFormats = { full: 'DD.MM.YYYY', monthYear: 'MMM YYYY' };

/**
 * Big-endian dates with the year first, as Korean and Chinese both write them.
 * `M월`/`M月` rather than `MMM` on purpose: the unit marker IS the month name in
 * these languages, so the numeral needs no abbreviated-month lookup (and none of
 * `capitalizedMonthsShort`'s casing work, which is a no-op in a unicameral
 * script anyway).
 */
const KOREAN_DATES: DateFormats = { full: 'YYYY.MM.DD', monthYear: 'YYYY년 M월' };
const CHINESE_DATES: DateFormats = { full: 'YYYY.MM.DD', monthYear: 'YYYY年M月' };

/**
 * Japanese marks the FULL date with its units too, which neither of the other two
 * does: a 履歴書 writes a date of birth as `1987年6月15日`, not `1987.06.15`. Same
 * big-endian order, one step more explicit — and `M`/`D` rather than `MM`/`DD`,
 * because a unit-marked Japanese date is never zero-padded (`3月`, not `03月`).
 *
 * The unit characters are literals to dayjs, which only reads ASCII letters as
 * format tokens, so no escaping is needed.
 */
const JAPANESE_DATES: DateFormats = { full: 'YYYY年M月D日', monthYear: 'YYYY年M月' };

export interface LocaleMeta {
  /** Locale code; doubles as the i18next resource key and the dayjs locale name. */
  code: Locale;
  /**
   * How this language orders a date on the CV. Required rather than optional so
   * that widening the `Locale` union makes `tsc` ask the question for locale
   * number 20 — `WESTERN_DATES` is the answer for most of them, but it has to be
   * chosen rather than defaulted into.
   */
  dateFormats: DateFormats;
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
    dateFormats: WESTERN_DATES,
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
    dateFormats: WESTERN_DATES,
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
    dateFormats: WESTERN_DATES,
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
    dateFormats: WESTERN_DATES,
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
    dateFormats: WESTERN_DATES,
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
    dateFormats: WESTERN_DATES,
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
    dateFormats: WESTERN_DATES,
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
    dateFormats: KOREAN_DATES,
    short: 'KO',
    nativeName: '한국어',
    dir: 'ltr',
    capitalizeMonths: false,
    digits: 'latn',
    cv: true,
    region: 'asia',
    antd: koKR,
  },
  /**
   * Mandarin Chinese in simplified characters — the second East Asian locale, and
   * the one that shows what Korean's cost was really made of.
   *
   * Korean generalized the rule that a script is expensive when its glyphs need
   * CONTEXT, not when its alphabet is large; Chinese is the extreme case of the
   * second half of that. It has no contextual forms, no reordering, no combining
   * marks and no bidi — nothing for a shaping pass to do — and yet `NotoSansSC`
   * is 8.0 MB per weight against NanumGothic's 2.0 MB, because Han is ~21,000
   * separate ideographs where Hangul is 11,172 syllables built from 51 parts.
   * So this locale is, again, a translation plus a font: see `services/pdf.ts`
   * for why the export and the preview share one file here (they cannot drift),
   * and `vite.config.ts` for why that file is not precached.
   *
   * `nativeName` says 简体中文 rather than 中文 because the distinction is real: a
   * Traditional locale would be a separate entry with different LABELS, not just
   * different glyphs (see the `Locale` union).
   *
   * `capitalizeMonths: false` — Han is unicameral, and dayjs's short Chinese
   * months are numerals (`3月`) with no case to change. `digits: 'latn'`: Chinese
   * has 一二三 and 〇 for prose, but writes dates and ages in Western digits.
   */
  zh: {
    code: 'zh',
    dateFormats: CHINESE_DATES,
    short: 'ZH',
    nativeName: '简体中文',
    dir: 'ltr',
    capitalizeMonths: false,
    digits: 'latn',
    cv: true,
    region: 'asia',
    antd: zhCN,
  },
  /*
   * French, German, Italian and Turkish — added together, and the first BATCH
   * where the answer to "what does this script need" was nothing at all.
   *
   * Spanish was the first single locale of this kind; these four confirm it is a
   * class and not a coincidence. All four are written in Latin, so Inter draws
   * every letter they use — checked with fontkit against the shipped TTFs rather
   * than assumed, including the awkward ones: `œ Œ ÿ` (French), `ß` and the
   * capital `ẞ` (German), `ı İ ş ğ` (Turkish, already required by Azerbaijani)
   * and the `€`/`₺` currency signs. No font to register, no `@font-face`, no
   * shaping pass, no digit localization, and none of the four dayjs bundles ships
   * a `preparse`/`postformat` that could reach a stored ISO date. Hence
   * `cv: true` from the start for all of them.
   *
   * `capitalizeMonths: true` throughout, for two different reasons: German
   * capitalizes month names as nouns anyway, while French and Italian write them
   * lower case and are title-cased here as the same house-style call already made
   * for Russian and Spanish, so a CV reads the same in every language.
   */
  fr: {
    code: 'fr',
    dateFormats: WESTERN_DATES,
    short: 'FR',
    nativeName: 'Français',
    dir: 'ltr',
    capitalizeMonths: true,
    digits: 'latn',
    cv: true,
    region: 'europe',
    antd: frFR,
  },
  de: {
    code: 'de',
    dateFormats: WESTERN_DATES,
    short: 'DE',
    nativeName: 'Deutsch',
    dir: 'ltr',
    capitalizeMonths: true,
    digits: 'latn',
    cv: true,
    region: 'europe',
    antd: deDE,
  },
  it: {
    code: 'it',
    dateFormats: WESTERN_DATES,
    short: 'IT',
    nativeName: 'Italiano',
    dir: 'ltr',
    capitalizeMonths: true,
    digits: 'latn',
    cv: true,
    region: 'europe',
    antd: itIT,
  },
  /**
   * Turkish — filed under the Caucasus/West Asia heading beside Azerbaijani
   * rather than under Europe: the rule is where the language ORIGINATES, and
   * Turkish is Oghuz Turkic, the same branch as the app's own default language.
   *
   * The one thing worth knowing about it is casing, and it is already handled:
   * Turkish pairs `i`/`İ` and `ı`/`I`, so a locale-blind `toUpperCase()` would
   * write `IL` for `il`. `capitalizedMonthsShort` in `utils/date` upper-cases
   * through `toLocaleUpperCase(locale)` — added for Azerbaijani, which has the
   * same pair — and `utils/search`'s fold already maps `İ` to `i`, so the
   * dictionary search works from a keyboard with no Turkish layout.
   */
  tr: {
    code: 'tr',
    dateFormats: WESTERN_DATES,
    short: 'TR',
    nativeName: 'Türkçe',
    dir: 'ltr',
    capitalizeMonths: true,
    digits: 'latn',
    cv: true,
    region: 'caucasusWestAsia',
    antd: trTR,
  },
  /*
   * Portuguese, Polish, Hungarian, Greek, Kazakh and Uzbek — six locales added
   * together, and between them they confirm the Spanish/French-batch finding
   * from the OTHER direction: Greek and Kazakh are new SCRIPTS, not new Latin
   * letters, and Inter draws both anyway (checked with fontkit against the
   * shipped TTFs: the full Greek alphabet plus tonos/dialytika accents, and
   * Kazakh's nine extra Cyrillic letters `ә ғ қ ң ө ұ ү һ і`). So this is a
   * six-locale batch with, again, no font to register, no `@font-face`, no
   * shaping pass — `cv: true` from the start for all six.
   *
   * The one real defect the batch surfaced was not a glyph, it was a NAME
   * COLLISION one script down: dayjs ships Uzbek in Cyrillic under the key
   * `uz` and in Latin — the script this app's `uz` translation and antd's own
   * `uz_UZ` bundle both use — under the different key `uz-latn`. See the
   * `dayjs.locale(…)` re-registration above `import type { Locale }`, which
   * is what makes `dayjs.locale('uz')` resolve to Latin rather than to
   * dayjs's default Cyrillic data.
   *
   * `capitalizeMonths: true` throughout: all six scripts have letter case
   * (Greek and Kazakh Cyrillic included), so the house-style call already
   * made for Spanish/Russian/the French batch applies uniformly.
   */
  pt: {
    code: 'pt',
    dateFormats: WESTERN_DATES,
    short: 'PT',
    nativeName: 'Português',
    dir: 'ltr',
    capitalizeMonths: true,
    digits: 'latn',
    cv: true,
    region: 'europe',
    antd: ptPT,
  },
  pl: {
    code: 'pl',
    dateFormats: WESTERN_DATES,
    short: 'PL',
    nativeName: 'Polski',
    dir: 'ltr',
    capitalizeMonths: true,
    digits: 'latn',
    cv: true,
    region: 'europe',
    antd: plPL,
  },
  hu: {
    code: 'hu',
    dateFormats: WESTERN_DATES,
    short: 'HU',
    nativeName: 'Magyar',
    dir: 'ltr',
    capitalizeMonths: true,
    digits: 'latn',
    cv: true,
    region: 'europe',
    antd: huHU,
  },
  el: {
    code: 'el',
    dateFormats: WESTERN_DATES,
    short: 'EL',
    nativeName: 'Ελληνικά',
    dir: 'ltr',
    capitalizeMonths: true,
    digits: 'latn',
    cv: true,
    region: 'europe',
    antd: elGR,
  },
  /**
   * Kazakh and Uzbek are filed under `asia` rather than `caucasusWestAsia`,
   * unlike Turkish: both are Turkic languages too, but Turkish sits beside
   * Azerbaijani specifically because they are the same Oghuz branch. Kazakh is
   * Kipchak and Uzbek is Karluk — different branches, and geographically
   * Central Asian rather than Caucasus/West Asian, so the generic `asia`
   * heading (already home to Korean and Chinese) is the honest fit; there is
   * no dedicated Central Asia region and inventing one for two languages would
   * cost every other picker a region nobody else uses.
   */
  kk: {
    code: 'kk',
    dateFormats: WESTERN_DATES,
    short: 'KK',
    nativeName: 'Қазақша',
    dir: 'ltr',
    capitalizeMonths: true,
    digits: 'latn',
    cv: true,
    region: 'asia',
    antd: kkKZ,
  },
  uz: {
    code: 'uz',
    dateFormats: WESTERN_DATES,
    short: 'UZ',
    nativeName: 'Oʻzbekcha',
    dir: 'ltr',
    capitalizeMonths: true,
    digits: 'latn',
    cv: true,
    region: 'asia',
    antd: uzUZ,
  },
  /**
   * Japanese — the third East Asian locale, and the first one whose script was
   * ALREADY DRAWABLE by a shipped font and still needed a new one.
   *
   * `NotoSansSC` has every kana and every kanji this app will ever print (checked
   * with fontkit before anything was written: 93 hiragana, 96 katakana, the kokuji
   * 働峠込辻匂, all of it). Reusing it would have cost nothing and been wrong:
   * 65.6% of the ideographs the Chinese and Japanese faces share are drawn with
   * DIFFERENT OUTLINES, including 25 of the 43 characters in ordinary CV
   * vocabulary — 氏名, 学歴, 職歴, 資格, 免許, 会社, 卒業. Han is one encoding and
   * two typographic traditions. Same shape of mistake as Mtavruli months in
   * Georgian: the glyphs exist, they are simply not this language's.
   *
   * So `NotoSansJP` ships beside it, and the consequence is bigger than one file —
   * two faces claiming the same code points cannot both be in a fixed stack, so
   * the UI's font order became per-language (`uiFontFamily`) the way the CV's
   * already was (`cvFontStack`). See `templates/_core/fonts.ts`.
   *
   * Everything else was cheap, for the reasons Korean and Chinese established:
   * kana and kanji are one code point per glyph with no contextual forms, so there
   * is nothing to shape and no bidi. `capitalizeMonths: false` — unicameral, and
   * dayjs's Japanese months are numerals (`3月`). `digits: 'latn'`: Japanese has
   * 一二三 but writes dates and ages in Western digits.
   */
  ja: {
    code: 'ja',
    dateFormats: JAPANESE_DATES,
    short: 'JA',
    nativeName: '日本語',
    dir: 'ltr',
    capitalizeMonths: false,
    digits: 'latn',
    cv: true,
    region: 'asia',
    antd: jaJP,
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
