# Adding a UI/CV language

The app ships Azerbaijani (default), Russian, English, Georgian and Arabic.
Adding Turkish, German, Farsi … is an **additive** change: no component holds a
language list, and no existing translation has to be touched.

Two lists, not one: `SUPPORTED_LOCALES` is what the app is translated into, and
`CV_LOCALES` (`LocaleMeta.cv`) is what a CV can be *exported* in. They are
identical today — the flag exists because Arabic needed a font, digit
localization and a shaping pass before it could join the second list, and a
language whose script the exporter cannot draw belongs in the UI switcher only.

`src/app/i18n/locales.ts` is the single registry. Because `LOCALES` is a total
`Record<Locale, LocaleMeta>`, widening the `Locale` union makes the compiler list
everything that still needs attention — the union widening *is* the checklist.
What the compiler cannot see is asserted in `src/app/i18n/locales.test.ts`: that
the bundle is registered, that it has the same keys as the default locale with no
empty values, and that the dayjs data was imported.

## Required steps

1. **Widen the union** — `src/types/resume.ts`:
   ```ts
   export type Locale = 'az' | 'ru' | 'en' | 'ka' | 'tr';
   ```
   `tsc` now fails until step 3.

2. **Add the UI strings** — copy `src/app/i18n/az.json` to `tr.json`, translate,
   then register it in `src/app/i18n/index.ts` (one `import`, one `resources`
   entry). Keep the key set identical — a missing key silently falls back to
   Azerbaijani, i.e. a half-translated UI in a language nobody on the team reads,
   which is why `locales.test.ts` fails on any gap.

3. **Register the locale** — one entry in `LOCALES`:
   ```ts
   tr: { code: 'tr', short: 'TR', nativeName: 'Türkçe', dir: 'ltr',
         capitalizeMonths: true, cv: true, antd: trTR },
   ```
   plus the two side-effect imports at the top of that file: the AntD bundle
   (`antd/locale/tr_TR`) and the dayjs locale (`dayjs/locale/tr`). If dayjs has no
   data for the language, import the closest one and note it — dayjs only supplies
   month/weekday names and the first day of the week here.

   `capitalizeMonths` is `false` for scripts with no title case. Georgian is the
   cautionary case: Mkhedruli *does* have Unicode uppercase forms (Mtavruli), so
   `toLocaleUpperCase('ka')` produced "Თებ" — not a capitalized month but a
   spelling error, since Mtavruli is only ever used for whole words. Arabic,
   Farsi and Hebrew are unicameral, so `false` for them too.

   `cv` says whether a CV may be *exported* in the language. Default it to
   `true`; set it to `false` only when the exporter demonstrably cannot render
   the script (Arabic, below), and say why in a comment.

   **Check the dayjs locale for a `postformat`.** dayjs's Arabic data rewrites
   every digit it formats into Arabic-Indic numerals — and it does that inside
   `.format('YYYY-MM-DD')` too, the call whose result is *stored*. An Arabic UI
   would have persisted `٢٠٢٦-٠٧-٣١` as a date of birth: no longer the ISO string
   the model is defined in, and unreadable to every other locale. `utils/date`
   overrides `preparse`/`postformat` with identity functions for every locale for
   that reason; `date.test.ts` asserts stored dates stay in Western digits.

   That entry alone lights up the header switcher, the CV-language select, the
   AntD component text, date formatting, `<html lang>`/`<dir>`, and the PDF
   export's headings.

4. **A font, if the language brings a new script.** Inter covers Latin
   (Azerbaijani `ə ğ ı İ ş` included) and Cyrillic and nothing else. A script it
   has no glyphs for exports as a page of **blanks** — react-pdf falls back to
   Helvetica per glyph, and Helvetica has no more Georgian or Arabic than Inter
   does. Georgian is the worked example:

   - a static TTF per weight in `public/fonts/ttf/` (react-pdf's fontkit cannot
     use variable fonts) plus its licence next to `OFL.txt`;
   - the family appended to `CV_FONT_STACK` in `src/templates/_core/fonts.ts` and
     to `FONT_FAMILY` in `src/app/theme.ts`;
   - `Font.register` for it in `registerResumeFonts` (`src/services/pdf.ts`);
   - a `unicode-range`-scoped `@font-face` in `src/index.css`, so the other
     locales never download it — and so the preview draws the same face the PDF
     embeds.

   Per-glyph fallback then happens in both targets from one declaration: the
   browser does it natively, and `react-pdf-html` splits a comma-separated
   `font-family` into the array form `@react-pdf`'s `fontSubstitution` walks.
   (`@react-pdf` itself does *not* split a string — a real `StyleSheet` must be
   handed the array.) `templates.pdf.test.tsx` asserts a CV in the new script
   embeds both families and never falls back to Helvetica.

## Optional steps

5. **Dictionary labels** — add a `"tr"` column to `src/data/*.json`. Rows without
   it fall back to `az` via `dictionaryLabel()`, so this can be done gradually,
   dataset by dataset; values already saved in a CV re-label themselves as soon
   as the column exists, since they are stored as codes rather than text.

   Georgian and Arabic are fully translated in the four groups whose labels a user
   reads in a select or on the finished CV — **skills (342), nationality (34),
   languages (18), interests (17)** — and `src/data/datasets.test.ts` holds those
   four to full coverage for every supported locale, so this step is only
   *optional* until the test says otherwise. **`colleges` (127) and the 62
   Azerbaijani `universities` are deliberately left in Azerbaijani**: they are
   institution *names*, and a transliteration is less useful than the real one.
   (The 50 foreign universities added alongside them carry every locale.)

   Software and product names stay in Latin script in every locale — that is how
   they are written in a real CV, and transliterating them would make them
   unsearchable.

   One dataset is not optional: **`languages`**. `LanguageItem.code` is the only
   field in the model with no free-text fallback (§13.1), so a language missing
   from that file cannot be claimed on a CV at all — shipping a Georgian UI while
   Georgian was absent from the list meant a Georgian user could not list their
   own mother tongue. A test now asserts every UI language has a row.

6. **Template names** — `TemplateManifest.name` requires only `az`, so existing
   template folders keep working untouched. Add the new code when convenient.

## Right-to-left languages (Arabic, Farsi, Hebrew)

Arabic is the worked example, and it ships complete: UI, preview and export.

`dir: 'rtl'` flips the **editor UI** — AntD's `ConfigProvider` gets
`direction="rtl"` and `<html dir="rtl">` is set, so layout, form controls and
icons mirror. Two things had to be done by hand around it:

- **The preview frame opts out** (`A4Frame` sets `dir="ltr"`). The exported PDF
  inherits no page direction, so a mirrored preview would stop showing what the
  export produces — and the page is laid out at full width and scaled from its
  top-left corner, which under RTL packed it against the right edge and cropped
  it. Scaling geometry and writing direction are unrelated; the frame keeps them
  apart.
- **Physical directions in components.** `insetInlineEnd`/`textAlign: 'end'`
  rather than `right`, or the control does not mirror. There is no lint rule for
  this; grep for `right:`/`paddingLeft`/`textAlign: 'right'` when adding an RTL
  locale.

### The calendar's arrows mirror on purpose — do not "fix" them

QA has reported this as a bug, and it is not one. In an RTL locale the date
picker's header arrows are reversed relative to a Latin one: **"go back in time"
points RIGHT and sits on the right**, because in a right-to-left reading order
"back" *is* rightwards. Ant Design does this deliberately —
`antd/lib/date-picker/style/panel.js` has a `&-rtl` block that re-rotates
`prev-icon`/`super-prev-icon` to `45deg` and `next`/`super-next` to `-135deg`,
on top of the flex row reversing the buttons' positions. So both the glyph and
its placement flip, which is the correct convention.

Someone testing with a left-to-right mental model will read "the left arrow
moved me forward" as reversed logic. It is not. The arrows also already carry
accessible names (rc-picker sets `aria-label` from the AntD locale's
`previousYear`/`nextMonth`/…), so the direction is machine-readable without
interpreting the icon — a screenshot-driven tester that clicks by coordinate
simply never sees them.

The real cost here was never the direction, it was the number of clicks. Both
fixes for that are locale-agnostic and live in `utils/date`: `datePlaceholder`
advertises the format so the date can be typed instead of paged, and
`dobPickerStart` opens a date-of-birth panel a generation back.

### PDF shaping: why `utils/arabic` exists

`@react-pdf/textkit` runs its bidi pass FIRST, reordering the line into visual
order, and pdfkit's `layoutRun` then calls fontkit with `direction: 'ltr'` so it
will not reorder again. The shaper therefore reads Arabic **backwards**. Measured
on `مرحبا` with the shipped Noto Sans Arabic:

| | glyphs |
|---|---|
| correct (fontkit, RTL) | `alef.fina beh.medi hah.init reh.fina meem.init` |
| unshaped, through the exporter | `alef.isol beh.init hah.medi reh.fina meem.isol` |

Every letter but one in the wrong contextual form, and `لا` drawn as two isolated
letters instead of the mandatory lam-alef ligature.

`preshapeArabic` (applied to the rendered markup in `buildResumeDocument`, so no
template knows about it) does the joining itself and hands the engine **Arabic
Presentation Forms** — one code point per letter *per position*, so reordering no
longer changes how anything looks. Two details worth keeping:

- **The tables are derived, not typed.** Every presentation character
  NFKC-normalizes back to its base letter, and each letter's forms are listed
  consecutively: 4 code points for a dual-joining letter, 2 for a right-joining
  one. So the joining classes and the form tables both fall out of data the JS
  engine already ships. Noto Sans Arabic covers 141 of the 144 Forms-B points.
- **A U+200C between every pair is required.** The engine re-runs its own joining
  analysis on whatever it is handed — presentation forms included — and on its
  reversed line that analysis is wrong again (measured: an INITIAL form on a
  word-final letter, and a lam-alef ligature invented out of every `ال`). The
  non-joiner breaks that context and has a zero advance. With it, the exported
  widths land within 1.9% of correct shaping (most words exact); the residue is
  the font's own `.wide` justification variants.

**The cost, and it is a real one:** the PDF's text layer holds presentation forms
separated by U+200C rather than plain letters. `String.normalize('NFKC')` maps
them back and `arabic.test.ts` asserts that round trip, but a naive ATS parser
does neither. Deleting the `withNonJoiners` call restores a clean text layer and
brings back the broken joining — that is the whole trade, in one function.

Still **not** solved: the CV templates lay out left-to-right (physical CSS;
`react-pdf-html` has no logical properties), so an Arabic CV reads right-to-left
*within* each block but the blocks themselves — sidebar, date column — keep their
Latin arrangement. A mirrored template is a new folder, which is exactly what the
plug-in system is for; core does not change.
