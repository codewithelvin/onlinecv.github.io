import { createElement } from 'react';
import type { JSX, ReactElement, ReactNode } from 'react';
// Type-only: erased at build time, so the engine stays in its lazy chunk.
import type * as ReactPdf from '@react-pdf/renderer';
import type Html from 'react-pdf-html';
import type { Resume, TemplateId } from '../types/resume';
import type { PageMargin } from '../types/template';
import { makeDateFormatter } from '../utils/date';
import {
  ATTRIBUTION_BOTTOM,
  ATTRIBUTION_COLOR,
  ATTRIBUTION_FONT_SIZE,
  ATTRIBUTION_TEXT,
  showAttribution,
} from '../utils/attribution';
import { localizeResume, referencedDictionaryGroups } from '../utils/localize-resume';
import { loadDictionaries } from '../data/dictionaries';
import { getTemplate } from '../templates/_core/registry';
import { i18n } from '../app/i18n';

/**
 * PDF export boundary (spec §5/§7.1/§19). The `@react-pdf/renderer` engine,
 * `react-pdf-html`, and the Inter fonts are ALL dynamically imported here so
 * they are code-split and loaded only on the first Download — keeping the
 * initial bundle small and typing responsive.
 */

let fontsRegistered = false;

const FONT_BASE = `${import.meta.env.BASE_URL}fonts/ttf`;

function sanitizeFilename(resume: Resume): string {
  const name = `${resume.basics.firstName}_${resume.basics.lastName}`
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .replace(/^_+|_+$/g, '');
  return `${name || 'resume'}_CV.pdf`;
}

/** How long the blob URL is kept alive after the click (see below). */
const REVOKE_DELAY_MS = 10_000;

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  /**
   * NOT revoked synchronously after `click()`.
   *
   * Chromium copies the blob before returning from the click, so revoking right
   * away is harmless there. Firefox starts the download asynchronously and reads
   * the blob URL afterwards — revoking in the same tick races that read and the
   * download fails or saves an empty file. Deferring costs a few hundred KB of
   * memory for a few seconds and makes the two engines behave the same.
   */
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
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
  }: {
    /** `renderToStaticMarkup` of the template. */
    html: string;
    /** PDF document title (metadata). */
    title?: string;
    /** Render the "Made with …" credit (see `utils/attribution`). */
    attribution: boolean;
    /** The template's per-page vertical margin (`manifest.pageMargin`). */
    pageMargin?: PageMargin;
  },
): ReactElement {
  const { Document, Page, Text, View, StyleSheet } = pdfLib;

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
    // A decorative layer that must escape the page margin and repeat on every
    // page (the modern template's accent column).
    const pageBleed = attributes['data-page-bleed'] !== undefined;
    return createElement(View, {
      style: style as never,
      wrap: keepTogether ? false : undefined,
      fixed: pageBleed ? true : undefined,
      children,
    });
  };

  const styles = StyleSheet.create({
    page: {
      fontFamily: 'Inter',
      fontSize: 10,
      lineHeight: 1.4,
      color: '#1a1a1a',
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
        // marker into react-pdf's `wrap` prop.
        renderers: { div: blockRenderer },
        children: html,
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

  const { Font, pdf } = pdfLib;
  const HtmlComponent = htmlModule.default;
  const { renderToStaticMarkup } = serverModule;

  if (!fontsRegistered) {
    Font.register({
      family: 'Inter',
      fonts: [
        { src: `${FONT_BASE}/Inter-Regular.ttf`, fontWeight: 400 },
        { src: `${FONT_BASE}/Inter-Medium.ttf`, fontWeight: 500 },
        { src: `${FONT_BASE}/Inter-SemiBold.ttf`, fontWeight: 600 },
        { src: `${FONT_BASE}/Inter-Bold.ttf`, fontWeight: 700 },
      ],
    });
    // Text-based, ATS-parseable output: don't insert soft hyphens.
    Font.registerHyphenationCallback((word) => [word]);
    fontsRegistered = true;
  }

  const entry = getTemplate(templateId);
  const Template = (await entry.load()).default;

  const t = i18n.getFixedT(resume.locale);
  const formatDate = makeDateFormatter(resume.locale);
  // Dictionary-backed labels (skills, languages, interests, nationality,
  // institutions) are resolved into the CV language, not left in whatever
  // language they happened to be typed in.
  const dicts = await loadDictionaries(referencedDictionaryGroups(resume));
  const localized = localizeResume(resume, resume.locale, dicts);
  const html = renderToStaticMarkup(
    createElement(Template, { resume: localized, t, formatDate }),
  );

  const document = buildResumeDocument(pdfLib, HtmlComponent, {
    html,
    title: `${resume.basics.firstName} ${resume.basics.lastName} — CV`.trim(),
    attribution: showAttribution(resume),
    pageMargin: entry.manifest.pageMargin,
  });

  const blob = await pdf(document).toBlob();
  triggerDownload(blob, sanitizeFilename(resume));
}
