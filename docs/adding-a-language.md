# Adding a UI/CV language

The app ships Azerbaijani (default), Russian, English and Georgian. Adding
Turkish, German, Farsi, Arabic … is an **additive** change: no component holds a
language list, and no existing translation has to be touched.

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
         capitalizeMonths: true, antd: trTR },
   ```
   plus the two side-effect imports at the top of that file: the AntD bundle
   (`antd/locale/tr_TR`) and the dayjs locale (`dayjs/locale/tr`). If dayjs has no
   data for the language, import the closest one and note it — dayjs only supplies
   month/weekday names and the first day of the week here.

   `capitalizeMonths` is `false` for scripts with no title case. Georgian is the
   cautionary case: Mkhedruli *does* have Unicode uppercase forms (Mtavruli), so
   `toLocaleUpperCase('ka')` produced "Თებ" — not a capitalized month but a
   spelling error, since Mtavruli is only ever used for whole words.

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

   Georgian is fully translated in the four groups whose labels a user reads in a
   select or on the finished CV — **skills (273), nationality (34), languages
   (18), interests (17)** — and `src/data/datasets.test.ts` holds those four to
   full coverage for every supported locale. **`colleges` (127) and the 62
   Azerbaijani `universities` are deliberately left in Azerbaijani**: they are
   institution *names*, and a transliteration is less useful than the real one.
   (The 50 foreign universities added alongside them carry every locale.)

   One dataset is not optional: **`languages`**. `LanguageItem.code` is the only
   field in the model with no free-text fallback (§13.1), so a language missing
   from that file cannot be claimed on a CV at all — shipping a Georgian UI while
   Georgian was absent from the list meant a Georgian user could not list their
   own mother tongue. A test now asserts every UI language has a row.

6. **Template names** — `TemplateManifest.name` requires only `az`, so existing
   template folders keep working untouched. Add the new code when convenient.

## Right-to-left languages (Farsi, Arabic, Hebrew)

Set `dir: 'rtl'` in the registry entry. That flips the **editor UI**: AntD's
`ConfigProvider` gets `direction="rtl"` and `<html dir="rtl">` is set, so layout,
form controls, and icons mirror.

What is **not** solved by that flag:

- **The CV templates.** Their inline styles use physical directions
  (`paddingLeft`, `textAlign: 'left'`, the modern template's left sidebar) because
  `react-pdf-html` supports no logical properties. An RTL template needs its own
  folder — which is exactly what the plug-in system is for; core does not change.
- **PDF text shaping.** `@react-pdf/renderer` has limited bidi/Arabic support:
  glyph joining and mixed LTR/RTL runs (a Latin e-mail inside Arabic text) do not
  reliably shape correctly. The font side is now a solved problem (step 4), the
  shaping is not.

So an RTL **UI** is a registry entry; an RTL **exported CV** is a separate piece
of work and should be scoped on its own.
