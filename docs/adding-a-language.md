# Adding a UI/CV language

The app ships Azerbaijani (default), Russian and English. Adding Georgian,
Turkish, German, Farsi, Arabic … is an **additive** change: no component holds a
language list, and no existing translation has to be touched.

`src/app/i18n/locales.ts` is the single registry. Because `LOCALES` is a total
`Record<Locale, LocaleMeta>`, widening the `Locale` union makes the compiler list
everything that still needs attention — the union widening *is* the checklist.

## Required steps

1. **Widen the union** — `src/types/resume.ts`:
   ```ts
   export type Locale = 'az' | 'ru' | 'en' | 'ka';
   ```
   `tsc` now fails until step 3.

2. **Add the UI strings** — copy `src/app/i18n/az.json` to `ka.json`, translate,
   then register it in `src/app/i18n/index.ts` (one `import`, one `resources`
   entry). Any key left untranslated falls back to `az` at runtime (i18next
   `fallbackLng`), so a partial file ships fine.

3. **Register the locale** — one entry in `LOCALES`:
   ```ts
   ka: { code: 'ka', short: 'KA', nativeName: 'ქართული', dir: 'ltr', antd: kaGE },
   ```
   plus the two side-effect imports at the top of that file: the AntD bundle
   (`antd/locale/ka_GE`) and the dayjs locale (`dayjs/locale/ka`). If dayjs has no
   data for the language, import the closest one and note it — dayjs only supplies
   month/weekday names and the first day of the week here.

   That alone lights up the header switcher, the CV-language select, the AntD
   component text, date formatting, `<html lang>`/`<dir>`, capitalized month
   names, and the PDF export's headings.

## Optional steps

4. **Dictionary labels** — add a `"ka"` column to `src/data/*.json` (skills 273,
   colleges 127, universities 62, nationality 34, languages 17, interests 17).
   Rows without the column fall back to `az` via `dictionaryLabel()`, so this can
   be done gradually, dataset by dataset. Values already saved in a CV re-label
   themselves as soon as the column exists — they are stored as codes, not text.

5. **Template names** — `TemplateManifest.name` requires only `az`, so existing
   template folders keep working untouched. Add `ka` when convenient.

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
  reliably shape correctly, and Inter carries no Arabic or Hebrew glyphs — a font
  covering the script has to be registered in `services/pdf.ts` as well.

So an RTL **UI** is a registry entry; an RTL **exported CV** is a separate piece
of work and should be scoped on its own.
