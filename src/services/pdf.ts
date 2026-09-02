import { createElement } from 'react';
import type { JSX, ReactElement, ReactNode } from 'react';
// Type-only: erased at build time, so the engine stays in its lazy chunk.
import type * as ReactPdf from '@react-pdf/renderer';
import type Html from 'react-pdf-html';
import type { Locale, Resume, TemplateId } from '../types/resume';
import type { PageBleed, PageMargin } from '../types/template';
import { LOCALES } from '../app/i18n/locales';
import { makeDateFormatter } from '../utils/date';
import {
  ATTRIBUTION_BOTTOM,
  ATTRIBUTION_COLOR,
  ATTRIBUTION_FONT_SIZE,
  ATTRIBUTION_TEXT,
  showAttribution,
} from '../utils/attribution';
import { preshapeArabic } from '../utils/arabic';
import { resumeSlug, triggerDownload } from '../utils/download';
import { localizeResume, referencedDictionaryGroups } from '../utils/localize-resume';
import { applyFieldVisibility } from '../utils/field-visibility';
import { sortResumeHistory } from '../utils/sort-history';
import { loadDictionaries } from '../data/dictionaries';
import { getTemplate } from '../templates/_core/registry';
import { cvFontStack } from '../templates/_core/fonts';
import {
  contactIcon,
  contactIconBox,
  stripIconArt,
  type ContactIconTone,
} from '../templates/_core/contact-icons';
import { fullName } from '../templates/_core/render-helpers';
import { bleedSide } from '../templates/_core/direction';
import { i18n } from '../app/i18n';

/**
 * PDF export boundary (spec §5/§7.1/§19). The `@react-pdf/renderer` engine,
 * `react-pdf-html`, and the Inter fonts are ALL dynamically imported here so
 * they are code-split and loaded only on the first Download — keeping the
 * initial bundle small and typing responsive.
 */

const FONT_BASE = `${import.meta.env.BASE_URL}fonts/ttf`;

/**
 * Register the CV's font stack with `@react-pdf` (idempotent).
 *
 * Exported, and taking the engine plus the font directory as arguments, for the
 * same reason as `buildResumeDocument` below: the PDF tests have to exercise the
 * app's own registration rather than re-declare their own, which drifts. They
 * pass a filesystem-relative `fontBase`; the app defaults to the deployed one.
 *
 * The stack itself is `templates/_core/fonts` — every family it names must be
 * registered here, or text in that script exports blank.
 *
 * "Already registered?" is answered by ASKING THE STORE, not by a module-level
 * boolean. The two differ in exactly one situation and it is a real one: a caller
 * that has emptied the store with `Font.clear()` — which is how a long-lived
 * process gets a font a second document can subset from scratch — would be told
 * "already done" by a flag and then hit `Font family not registered` on the next
 * render. In the app itself, where this runs once per page load, the two are the
 * same check.
 */
export function registerResumeFonts(pdfLib: typeof ReactPdf, fontBase: string = FONT_BASE): void {
  const { Font } = pdfLib;
  if (Font.getRegisteredFontFamilies().length > 0) return;

  Font.register({
    family: 'Inter',
    fonts: [
      { src: `${fontBase}/Inter-Regular.ttf`, fontWeight: 400 },
      { src: `${fontBase}/Inter-Medium.ttf`, fontWeight: 500 },
      { src: `${fontBase}/Inter-SemiBold.ttf`, fontWeight: 600 },
      { src: `${fontBase}/Inter-Bold.ttf`, fontWeight: 700 },
    ],
  });
  /**
   * Georgian, which Inter has no glyphs for at all. Two weights, not four: this
   * is a script-only build, so react-pdf picks the nearer of 400/700 for the
   * 500/600 headings, and the difference is worth less than the two extra files
   * would cost the offline precache.
   */
  Font.register({
    family: 'NotoSansGeorgian',
    fonts: [
      { src: `${fontBase}/NotoSansGeorgian-Regular.ttf`, fontWeight: 400 },
      { src: `${fontBase}/NotoSansGeorgian-Bold.ttf`, fontWeight: 700 },
    ],
  });
  /**
   * Arabic — same two-weight arrangement, same reason. The shaping (initial /
   * medial / final forms, the lam-alef ligature) comes from fontkit's OpenType
   * layout, and the right-to-left ordering from `@react-pdf/textkit`'s bidi
   * pass; both are exercised in `templates.pdf.test.tsx`.
   */
  Font.register({
    family: 'NotoSansArabic',
    fonts: [
      { src: `${fontBase}/NotoSansArabic-Regular.ttf`, fontWeight: 400 },
      { src: `${fontBase}/NotoSansArabic-Bold.ttf`, fontWeight: 700 },
    ],
  });
  /**
   * Hebrew — right-to-left, so it leans on the same bidi reordering Arabic does
   * (rewritten in `patches/@react-pdf+textkit+4.4.1.patch`), but it needs NO
   * shaping pass: Hebrew letters have no contextual forms and no mandatory
   * ligatures, so there is no equivalent of `utils/arabic` for it.
   */
  Font.register({
    family: 'NotoSansHebrew',
    fonts: [
      { src: `${fontBase}/NotoSansHebrew-Regular.ttf`, fontWeight: 400 },
      { src: `${fontBase}/NotoSansHebrew-Bold.ttf`, fontWeight: 700 },
    ],
  });
  /**
   * Korean. Hangul is written with 11,172 precomposed syllables, so this is the
   * one script face that is MEGABYTES rather than tens of kilobytes — 2.0 MB per
   * weight against Hebrew's 27 KB. It needs no shaping (a syllable is a single
   * code point) and no bidi, so the file size is very nearly the whole cost of
   * the locale.
   *
   * ⚠️ THE `.ttf` IS DELIBERATE, and the `.woff2` that `index.css` uses for the
   * PREVIEW must not be substituted for it here. fontkit reads woff2 perfectly
   * well and the export succeeds — but `@react-pdf/pdfkit` then embeds the WHOLE
   * font instead of subsetting it, because subsetting reads the `glyf`/`loca`
   * tables that a woff2 stores transformed. MEASURED on the same one-page Korean
   * document: **25 KB** from these TTFs, **1.7 MB** from the woff2s. A 6× larger
   * file in `public/` is the app's problem; a 68× larger PDF is the user's, and
   * they are about to attach it to a job application.
   */
  Font.register({
    family: 'NanumGothic',
    fonts: [
      { src: `${fontBase}/NanumGothic-Regular.ttf`, fontWeight: 400 },
      { src: `${fontBase}/NanumGothic-Bold.ttf`, fontWeight: 700 },
    ],
  });
  /**
   * Chinese (Han, simplified). The largest face here by a wide margin — 8.0 MB and
   * 8.2 MB, four times the Korean pair — because Han is ~21,000 separate ideographs
   * where Hangul is 11,172 syllables assembled from 51 parts. Like Hangul it needs
   * no shaping and no bidi, so the size is the whole cost of the locale again.
   *
   * ⚠️ AN .otf, AND IT SUBSETS — which is the one thing that had to be measured
   * before choosing it, because Korean's woff2 proved this engine will silently
   * embed a whole face when it cannot read the outline tables it wants. Noto CJK
   * publishes no static TTF (only CFF/OTF and a variable build fontkit cannot use),
   * so if the CFF path had not subsetted there would have been no Chinese export at
   * all. It does: a one-page Chinese CV comes out at 94.5 KB, embedded as
   * `FontFile3` / `CIDFontType0C` with proper `ABCDEF+` subset tags and no
   * Helvetica anywhere.
   *
   * Because there is only one file, `index.css` gives the PREVIEW this same .otf —
   * so unlike Korean, the two targets here cannot drift apart.
   */
  Font.register({
    family: 'NotoSansSC',
    fonts: [
      { src: `${fontBase}/NotoSansSC-Regular.otf`, fontWeight: 400 },
      { src: `${fontBase}/NotoSansSC-Bold.otf`, fontWeight: 700 },
    ],
  });
  /**
   * Japanese. The same CFF/OTF story as Chinese — and it was measured the same
   * way before the locale was written, because the Korean woff2 established that
   * this engine will silently embed a whole face rather than fail: a one-page
   * Japanese CV comes out at **67.5 KB** from 9.2 MB of registered font, with
   * `ABCDEF+` subset tags and `FontFile3`/`CIDFontType0C`.
   *
   * ⚠️ IT IS REGISTERED SEPARATELY FROM NotoSansSC AND MUST STAY THAT WAY. The two
   * cover the same ideographs, but 65.6% of the ones they share are drawn with
   * different outlines (fontkit, 1,806 sampled) — Chinese and Japanese are two
   * typographic traditions, not two encodings — so which face a document gets is
   * decided by `cvFontStack(resume.locale)`, and a Japanese CV that fell through to
   * NotoSansSC would be legible and visibly wrong.
   */
  Font.register({
    family: 'NotoSansJP',
    fonts: [
      { src: `${fontBase}/NotoSansJP-Regular.otf`, fontWeight: 400 },
      { src: `${fontBase}/NotoSansJP-Bold.otf`, fontWeight: 700 },
    ],
  });
  // Text-based, ATS-parseable output: don't insert soft hyphens.
  Font.registerHyphenationCallback((word) => [word]);
}

/**
 * Assemble the exported document from a template's rendered HTML.
 *
 * Exported, and taking the engine as an argument, for ONE reason: the pagination
 * and geometry tests must exercise the document the app actually ships. They
 * used to rebuild an approximation of it, and the approximation quietly drifted
 * — it had no `renderers`, so it could not have caught the stranded-heading bug
 * it was meant to guard. The engine is passed in rather than imported because
 * this module's whole job is to keep `@react-pdf` out of the main bundle.
 */
export function buildResumeDocument(
  pdfLib: typeof ReactPdf,
  HtmlComponent: typeof Html,
  {
    html,
    title,
    attribution,
    pageMargin,
    pageBleed,
    locale = 'az',
  }: {
    /** `renderToStaticMarkup` of the template. */
    html: string;
    /** PDF document title (metadata). */
    title?: string;
    /** Render the "Made with …" credit (see `utils/attribution`). */
    attribution: boolean;
    /** The template's per-page vertical margin (`manifest.pageMargin`). */
    pageMargin?: PageMargin;
    /** The template's full-height accent column (`manifest.pageBleed`). */
    pageBleed?: PageBleed;
    /**
     * The CV's language (`resume.locale`) — NOT the UI's. It decides the font
     * order and the text direction, both of which are core's business rather
     * than any template's.
     */
    locale?: Locale;
  },
): ReactElement {
  const rtl = LOCALES[locale].dir === 'rtl';
  const { Document, Image, Page, Text, View, StyleSheet } = pdfLib;

  /**
   * `<div>` renderer that honours the templates' `data-keep-together` marker
   * (`KEEP_TOGETHER` in `templates/_core/render-helpers`).
   *
   * A page break otherwise lands wherever the content happens to run out, which
   * is how a section heading ends up alone at the foot of a page with its
   * entries overleaf — the bug reported from a real export. Templates wrap the
   * heading and the section's first block in one marked box, and `wrap: false`
   * makes react-pdf move that box down whole rather than split it.
   *
   * The marker travels as an HTML attribute because the markup is the only
   * channel between a template and this renderer, and the browser preview
   * ignores it. Everything else matches react-pdf-html's own block renderer, so
   * an unmarked div behaves exactly as before.
   */
  const blockRenderer = ({
    element,
    style,
    children,
  }: {
    element?: { attributes?: Record<string, string> };
    style?: unknown;
    children?: ReactNode;
  }): JSX.Element => {
    const attributes = element?.attributes ?? {};
    const keepTogether = attributes['data-keep-together'] !== undefined;
    return createElement(View, {
      style: style as never,
      wrap: keepTogether ? false : undefined,
      children,
    });
  };

  /**
   * `<span>` renderer that turns a contact-channel marker into an INLINE image.
   *
   * `templates/_core/contacts` prints a small mark after a phone number so a
   * reader can tell a mobile from a landline from a WhatsApp number. It reaches
   * the PDF as an empty `<span data-contact-icon>` — deliberately empty, because
   * `react-pdf-html` reads an element's children to decide inline-versus-block
   * and an `<img>` in there would tear the contact line into stacked fragments.
   *
   * react-pdf then has exactly one way to draw a picture inside running text: an
   * `Image` child of a `Text`, which `@react-pdf/layout` turns into a textkit
   * ATTACHMENT (`U+FFFC`, with `xAdvance` taken from the box below). An `Svg`
   * there produces no fragments and disappears without an error, which is why
   * these are raster.
   *
   * The text layer is not touched: `@react-pdf/render` paints the image and then
   * swaps the object-replacement glyph for a SPACE, so an ATS reads the phone
   * number it always read.
   *
   * Everything WITHOUT the marker takes react-pdf-html's own inline treatment —
   * a `Text` with the parsed style — because the templates use plain `<span>`s
   * for field labels and this renderer replaces the default for the whole tag.
   */
  const inlineRenderer = ({
    element,
    style,
    children,
  }: {
    element?: { attributes?: Record<string, string> };
    style?: unknown;
    children?: ReactNode;
  }): JSX.Element => {
    const attributes = element?.attributes ?? {};
    const type = attributes['data-contact-icon'];
    if (type === undefined) return createElement(Text, { style: style as never, children });

    const tone = (attributes['data-contact-icon-tone'] ?? 'dark') as ContactIconTone;
    const drawn = Number(attributes['data-contact-icon-size']);
    const src = contactIcon(type as never, tone);
    if (!src || !Number.isFinite(drawn)) return createElement(Text, { style: style as never });
    /**
     * The box comes from `contactIconBox`, NOT from arithmetic repeated here: the
     * preview sizes the same mark from the same function, and a second copy of
     * "size plus three" is exactly how the two targets start disagreeing by a
     * point and a half. What the markup carries is the RESOLVED height, so the
     * ratio that centres the mark on the line is applied once.
     *
     * Wider than tall on purpose. react-pdf fits an attachment to its box
     * preserving aspect ratio and centres it horizontally, so the surplus width
     * becomes air on both sides — which is how the gap between a value and its
     * mark is built. It has to be done this way round: react-pdf ignores margins
     * on an inline attachment, and a one-sided gap would have to swap sides on a
     * right-to-left CV.
     */
    return createElement(Image, { src, style: contactIconBox(drawn) as never });
  };

  const styles = StyleSheet.create({
    page: {
      /**
       * The ARRAY form, not the comma string: `@react-pdf` reads a string as one
       * family name and would look for a font literally called
       * "Inter, NotoSansGeorgian". (Only `react-pdf-html` splits commas, which is
       * why the templates' CSS may use the string — see `_core/fonts`.)
       *
       * Ordered by the CV's language, and set HERE rather than in a template:
       * `fontFamily` is one of react-pdf's inheritable properties, so the whole
       * page picks it up. A template that pins its own would take the shared
       * characters (space, digits, punctuation) back to Inter and shatter every
       * Arabic line into alternating runs — see `cvFontStack`.
       */
      fontFamily: cvFontStack(locale),
      fontSize: 10,
      lineHeight: 1.4,
      color: '#1a1a1a',
      /**
       * Right-aligned for a right-to-left CV. `textAlign` inherits (react-pdf's
       * `BASE_INHERITABLE_PROPERTIES`), so every heading and paragraph follows
       * without a template knowing about it — and no shipped template pins
       * `textAlign: 'left'`, so nothing overrides it.
       *
       * `direction: 'rtl'` is deliberately NOT set: react-pdf does NOT inherit
       * it, so on the `Page` it would reach nothing, and where it does apply it
       * changes the bidi base level that `utils/arabic`'s pre-shaping was
       * measured against.
       */
      ...(rtl ? { textAlign: 'right' as const } : {}),
      /**
       * On the PAGE, so react-pdf re-applies it to every page. A template that
       * padded its own root instead would indent page 1 and leave page 2's
       * content hard against the paper edge.
       */
      paddingTop: pageMargin?.top ?? 0,
      paddingBottom: pageMargin?.bottom ?? 0,
    },
    /**
     * Absolutely positioned so it is OUT of the page's flex flow: an in-flow
     * footer would eat into the height the `Html` wrapper below grows into, and
     * the modern template's accent sidebar would stop short of the bottom edge
     * again. `fixed` repeats it on every page of a multi-page CV.
     */
    attribution: {
      position: 'absolute',
      /**
       * Straight from the paper edge: a `Page` child is positioned against the
       * page box, page margin and all. (Subtracting the margin — as the text
       * area's own absolute children must — pushed this 12pt off the bottom of
       * the sheet, where it was still in the file but invisible.)
       */
      bottom: ATTRIBUTION_BOTTOM,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontSize: ATTRIBUTION_FONT_SIZE,
      color: ATTRIBUTION_COLOR,
    },
  });

  return createElement(
    Document,
    { title },
    createElement(
      Page,
      { size: 'A4', style: styles.page },
      /**
       * The template's accent column, painted FIRST so everything else lands on
       * top of it, and `fixed` so it repeats on every page.
       *
       * A direct child of `Page`, which is the whole point. As an absolutely
       * positioned div inside the parsed markup it needed `top/bottom: -28` to
       * cancel the page margin and relied on `fixed` surviving several levels of
       * nesting — which `@react-pdf` v4 stopped doing, leaving the column on page
       * 1 only. Here it resolves against the PAGE box, margin included, so
       * `top: 0, bottom: 0` simply is the full sheet (the same rule the credit
       * line below depends on).
       */
      pageBleed
        ? createElement(View, {
            fixed: true,
            style: {
              position: 'absolute',
              top: 0,
              bottom: 0,
              // Mirrored for a right-to-left CV, so the column stays on the same
              // side as the sidebar once the template's root row has flipped.
              [bleedSide(pageBleed, locale)]: 0,
              width: pageBleed.width,
              backgroundColor: pageBleed.color,
            } as never,
          })
        : null,
      /**
       * `react-pdf-html` wraps the parsed markup in a `View` of its own, and that
       * wrapper — not the template's root element — is the direct child of
       * `Page`. Left at its default `flexGrow: 0` it hugs its content, so a
       * template root that asks to fill the page height (the modern template's
       * accent sidebar) has nothing to grow into and the column stops short of
       * the bottom edge. Growing the wrapper hands the page's full height down.
       */
      createElement(HtmlComponent, {
        resetStyles: true,
        style: { flexGrow: 1 },
        // HTML has no way to say "keep this heading with what follows", so the
        // templates mark such boxes in the markup and `blockRenderer` turns the
        // marker into react-pdf's `wrap` prop. `inlineRenderer` does the same job
        // for the contact-channel marks, which are `<span>`s carrying an id.
        renderers: { div: blockRenderer, span: inlineRenderer },
        /**
         * Arabic is joined HERE, not by the templates: react-pdf shapes a
         * right-to-left line after it has already reordered it, so the letters
         * come out in the wrong contextual forms unless they are handed over
         * pre-shaped (`utils/arabic`). Applying it to the finished markup keeps
         * the `TemplateProps` contract untouched — every template, present and
         * future, gets correct Arabic for free — and the function is a no-op for
         * a CV with no Arabic in it, so nothing else changes by a byte.
         *
         * `stripIconArt` runs first and drops the contact marks' base64 artwork,
         * which only the PREVIEW reads: `inlineRenderer` above re-resolves the
         * same file from `data-contact-icon`, so leaving it in would buy nothing
         * and cost an "unsupported style" warning plus a couple of kilobytes of
         * css-tree parsing per channel on every export.
         */
        children: preshapeArabic(stripIconArt(html)),
      }),
      // Rendered here rather than inside a template, so every template — present
      // and future — carries the credit without implementing it (§7.1: the
      // template contract stays untouched).
      attribution
        ? createElement(Text, { fixed: true, style: styles.attribution }, ATTRIBUTION_TEXT)
        : null,
    ),
  );
}

/**
 * Render the current resume + template to a text-based (ATS-friendly) PDF and
 * trigger a download. Section headings use `resume.locale` (§10.1), independent
 * of the UI locale. Throws on failure so the caller can surface an error (§17).
 */
export async function exportResumePdf(resume: Resume, templateId: TemplateId): Promise<void> {
  const [pdfLib, htmlModule, serverModule] = await Promise.all([
    import('@react-pdf/renderer'),
    import('react-pdf-html'),
    import('react-dom/server'),
  ]);

  const { pdf } = pdfLib;
  const HtmlComponent = htmlModule.default;
  const { renderToStaticMarkup } = serverModule;

  registerResumeFonts(pdfLib);

  const entry = getTemplate(templateId);
  const Template = (await entry.load()).default;

  const t = i18n.getFixedT(resume.locale);
  const formatDate = makeDateFormatter(resume.locale);
  // The same three projections the live preview applies, in the same order (see
  // `useLocalizedResume`): personal details the user turned off are blanked, the
  // dated sections are put in reverse-chronological order, then dictionary-backed
  // labels (skills, languages, interests, nationality, institutions) are resolved
  // into the CV language rather than left in whatever language they happened to
  // be typed in.
  const visible = sortResumeHistory(applyFieldVisibility(resume));
  const dicts = await loadDictionaries(referencedDictionaryGroups(visible));
  const localized = localizeResume(visible, resume.locale, dicts);
  const html = renderToStaticMarkup(createElement(Template, { resume: localized, t, formatDate }));

  const document = buildResumeDocument(pdfLib, HtmlComponent, {
    html,
    // Through `fullName`, not by hand: this string is what a recruiter's PDF
    // reader shows in its title bar, and a CJK name is ordered family-name-first
    // there for exactly the reason it is on the page itself.
    title: `${fullName(resume)} — CV`.trim(),
    attribution: showAttribution(resume),
    pageMargin: entry.manifest.pageMargin,
    pageBleed: entry.manifest.pageBleed,
    locale: resume.locale,
  });

  const blob = await pdf(document).toBlob();
  triggerDownload(blob, `${resumeSlug(resume)}_CV.pdf`);
}
