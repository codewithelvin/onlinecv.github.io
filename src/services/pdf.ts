import { createElement } from 'react';
import type { Resume, TemplateId } from '../types/resume';
import { makeDateFormatter } from '../utils/date';
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

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

  const { Document, Page, Font, StyleSheet, pdf } = pdfLib;
  const Html = htmlModule.default;
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
  const html = renderToStaticMarkup(createElement(Template, { resume, t, formatDate }));

  const styles = StyleSheet.create({
    page: {
      fontFamily: 'Inter',
      fontSize: 10,
      lineHeight: 1.4,
      color: '#1a1a1a',
    },
  });

  const document = createElement(
    Document,
    { title: `${resume.basics.firstName} ${resume.basics.lastName} — CV`.trim() },
    createElement(
      Page,
      { size: 'A4', style: styles.page },
      createElement(Html, { resetStyles: true, children: html }),
    ),
  );

  const blob = await pdf(document).toBlob();
  triggerDownload(blob, sanitizeFilename(resume));
}
