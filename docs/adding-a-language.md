# Adding a UI/CV language

The app ships Azerbaijani (default), Russian, English, Georgian, Arabic, Spanish,
Hebrew and Korean. Adding Turkish, German, Farsi … is an **additive** change: no
component holds a language list, and no existing translation has to be touched.

Spanish is the worked example of the *easy* case, and worth reading first if the
new language is written in Latin or Cyrillic: steps 1–3 plus the dictionaries, no
font work, no shaping, no digit handling. Inter already covers `á é í ó ú ü ñ ¿ ¡`
(check with fontkit, as step 4 describes), so `cv: true` held from the start.

Order in the switchers is **not** the order you declare the entry in:
`SUPPORTED_LOCALES` sorts the default locale first and the rest alphabetically by
`short`, so a new language places itself.

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
         capitalizeMonths: true, digits: 'latn', cv: true,
         region: 'caucasusWestAsia', antd: trTR },
   ```

   `region` is the heading the picker files the language under (`LocaleRegion`),
   assigned by where the language ORIGINATES — English, Spanish, Russian and Arabic
   are each spoken across several regions, so any other rule would need a language
   in two groups at once. All seven regions are already translated, so this is one
   word and no i18n work; a region with no languages in it is not rendered.

   **A flag, too** — `src/features/i18n/flags.tsx` holds a total
   `Record<Locale, ReactNode>`, so the compiler will not let the new locale through
   without one. Two rules there: it must be the REAL flag (see that file's note on
   why the artwork is inline SVG rather than `🇹🇷` — Windows ships no
   regional-indicator glyphs, so the emoji renders as the letters "TR"), and
   simplification is allowed only where it does not change what the flag IS. Bands
   and emblems get drawn; the US canton carries all fifty stars because the count is
   how the flag is recognized; the Saudi shahada is set as real Arabic text rather
   than decorative strokes. `flags.test.tsx` pins each of those.
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
     to `FONT_FAMILY` in `src/app/theme.ts` **and to the `body` rule in
     `src/index.css`** — that is *three* places, and the third is the one that
     drifts. `FONT_FAMILY` reaches AntD's components; the CSS rule reaches
     everything else, and it had silently missed the Arabic and Hebrew faces for
     two locales because Segoe UI covers both scripts on Windows and hid it.
     `fonts.test.ts` now fails if a family in `CV_FONT_STACK` is missing from
     `FONT_FAMILY`; the CSS half cannot be asserted (`css: false` under vitest
     makes `?raw` return an empty string), so check it by hand or in a browser;
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

   **A megabyte-scale font needs two more decisions, and Korean is the worked
   example.** Hangul has 11,172 precomposed syllables, so `NanumGothic` is 2.0 MB
   per weight against Hebrew's 27 KB — 4.1 MB for the pair, against a precache of
   6.9 MB for the whole app. So:

   - **Ship the woff2 for the preview and the TTF for the export.** The woff2 is
     341 KB + 417 KB for exactly the same glyphs, and the browser can use it. The
     exporter cannot: fontkit *reads* a woff2 quite happily, but `@react-pdf` then
     stops SUBSETTING and embeds the whole face, which took a measured one-page
     Korean CV from **25 KB to 1.7 MB**. A bigger file in `public/` is the app's
     problem; a 68× bigger PDF is the user's. This is the only script where the
     two targets load different files, and both sides say so in a comment.
   - **Keep the export TTFs out of the precache** (`globIgnores` +
     a `runtimeCaching` `CacheFirst` rule in `vite.config.ts`). Precaching them
     would have made every install of the app well over half again as big for a
     script most users will never type. The cost, which is worth stating in the
     PR: the *first* Korean PDF export needs the network. The UI and the preview
     are unaffected — they run off the precached woff2.
   - **Check the metrics before letting the new face lead.** `cvFontStack` puts
     the CV's own script first, which means that face also supplies every space,
     digit and comma. That is why Noto Georgian leading a Georgian CV prints
     double-width commas. `NanumGothic`'s shared characters are within 5% of
     Inter's (space 0.280 vs 0.281 em), so Korean pays nothing — but a Korean text
     face also ships **Latin**, unlike the script-only Noto builds, so a Korean CV
     contains no Inter at all. That is a deliberate, asserted outcome, not a bug.

## Required steps, continued

5. **Dictionary labels** — add a `"tr"` column to every file in `src/data/`.
   **This is no longer optional**: `src/data/datasets.test.ts` holds *all ten*
   groups to full coverage for every supported locale, so the suite goes red the
   moment the union is widened and stays red until the last row is translated.
   That is deliberate — the label is printed on the CV and picked from a select, so
   a user in the new language would otherwise be reading Azerbaijani in the middle
   of their own résumé.

   The volume, at the time of writing: skills 342, specialities 305, universities
   264, faculties 263, positions 243, cities 132, colleges 127, nationality 34,
   languages 18, interests 17 — **1,745 rows**. Do it with a script that rebuilds
   each row key-by-key (so the new column lands in the same place in every file)
   and *refuses to write* on an unmapped code, a duplicate label within the
   dataset, or a label longer than `FIELD_MAX` for that group. The three legacy
   synonym pairs in `skills` are the only rows allowed to share a label.

   Two guards worth adding to that script for a NON-LATIN locale, both of which
   have caught real mistakes: refuse a label containing a script from a
   *neighbouring* column (a copy-paste leak — `טרabzון` and `ბar-ილანის` both
   shipped that way and were found by grepping for Latin inside non-Latin columns),
   and refuse one that contains no character of the new script at all *unless* it is
   a deliberate Latin product name. Korean needs the second exemption more than any
   other locale: 53 of its 342 skills are `Microsoft Excel`, `PostgreSQL`, `Figma` —
   names that stay Latin in a real Korean CV.

   Values already saved in a CV re-label themselves as soon as the column exists,
   since they are stored as codes rather than as text.

   Conventions the earlier locales settled on:
   - **Software and product names stay in Latin** in every locale — that is how
     they are written in a real CV, and translating them would make them
     unsearchable. Same for the AZ-market tools (`Logo Tiger`, `E-taxes`, `BTP`).
   - **Institution and place names translate their descriptors and keep the proper
     name**: "Universidad Estatal de Bakú", not a transliteration of the whole
     string. Use the established exonym where the language has one (Bakú, Moscú,
     Estambul, El Cairo) and leave the rest in its international Latin form.
   - **`specialities` holds both programme names and profession names** on purpose
     ("Contabilidad" *and* "Contable"), because the field is labelled "Profession
     (specialty)" and users enter both. They must not collapse into one label.

   One dataset matters more than the others: **`languages`**. `LanguageItem.code`
   is the only field in the model with no free-text fallback (§13.1), so a language
   missing from that file cannot be claimed on a CV at all — shipping a Georgian UI
   while Georgian was absent from the list meant a Georgian user could not list
   their own mother tongue. A test asserts every UI language has a row, and it maps
   the locale to a code rather than assuming they match: Spanish is `hispanic`,
   the name the original dictionary used.

## Optional step

6. **Template names** — `TemplateManifest.name` requires only `az`, so existing
   template folders keep working untouched. Add the new code when convenient.

## Check that the language's own users can express their own data

This is where the real defects have been, every single time, and none of them was
in the translation. A locale is not shipped until its speakers can type their own
details into it.

The rules that broke, in order of discovery:

- **The name pattern** allowed Latin + Azerbaijani + Cyrillic letters only, so an
  Arabic or Georgian user could not get past the first wizard field. Now `\p{L}`.
- **The languages dictionary** had no Georgian row while the Georgian UI shipped,
  and `LanguageItem.code` is the one field with no free-text fallback — so a
  Georgian user could not claim their mother tongue. `datasets.test.ts` guards it.
- **Driver-licence categories** were a hard 11-value enum of the Azerbaijani set,
  shown to all locales, and it actively discarded anything else. The axis was wrong
  too: a licence is issued by a COUNTRY, not by the language the app is read in.
  Now suggestions + free text.
- **`min(3)` on first and last name.** A Korean surname is ONE syllable — 김, 이,
  박, and 이 alone belongs to about a fifth of the country — so the rule refused the
  surname of every Korean user. (It had also been refusing "Bo" and "Li" for years.)
  Removed: `.required()` on a trimmed string is the check that was actually wanted.

So for each new locale, ask concretely: **what does a name look like, what does a
date look like, and what would this person put in every enum-ish field?** Check the
name rule, `languages.json`, and anything with a fixed option list.

Two known cosmetic gaps that Korean exposed and did NOT change, because both are
spec'd formats (§10.2) applied uniformly to every locale:

- `MONTH_YEAR` is `MMM YYYY`, so a Korean CV reads `3월 2020` where the convention
  is `2020년 3월`; `FULL_DATE` is `DD.MM.YYYY` where Korean writes `2020.03.01`.
  Fixing this properly means a per-locale date-format table, which is a spec change
  rather than a bug fix — raise it before doing it.
- The age's counter word DID change, because that one was inside core rather than in
  the spec: `withUnit` in `render-helpers.ts` now writes `39세` and `39 il`,
  deriving the rule from the unit's own script so a future Japanese or Chinese
  locale inherits it.

## Right-to-left languages (Arabic, Hebrew, Farsi)

The two shipped RTL locales are complete — UI, preview and export — but they cost
very different amounts, and the difference is worth understanding before adding
the next one.

**Hebrew was cheap: a font, a registry entry, and nothing else.** Direction is
handled by the machinery Arabic already forced into place (`dir`, `isRtl`,
`mirrorRow`, `bleedSide`, and the rewritten `reorderLine` in
`patches/@react-pdf+textkit+4.4.1.patch`), and Hebrew needs **no shaping pass**:
its letters have no contextual initial/medial/final forms and no mandatory
ligatures, so there is no equivalent of `utils/arabic` and none of the text-layer
damage that workaround causes. Its exported text comes back **intact** —
`text-fidelity.test.tsx` holds Hebrew to the same must-survive standard as
Russian and Georgian, which is what `cv: true` rests on.

So the rule for the next RTL language: **if the script is non-joining (Hebrew,
Thaana), expect the Arabic work to carry it. If it is cursive-joining (Farsi,
Urdu, Syriac), expect to need `utils/arabic`'s treatment** — Farsi in particular
uses the Arabic script and would go through `preshapeArabic`, so it inherits both
the shaping fix and its text-layer trade-off.

**Korean generalizes the same rule past direction.** It is left-to-right, so none
of the RTL machinery is involved, and it needs no shaping either — for the Hebrew
reason rather than a new one: Hangul is written with **precomposed syllables**, one
code point per syllable, so there is nothing contextual to resolve. Its whole cost
was the font's SIZE (see step 4). Generalized: *what makes a script expensive is
per-glyph context, not the alphabet* — a Devanagari or Thai locale would be the
next genuinely hard case, because both reorder and combine marks; a Cyrillic,
Greek, Hangul or Kana one is a translation plus a font.

Arabic is the worked example of the hard case, and it ships complete: UI, preview
and export.

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
