import type { JSX } from 'react';
import type { LocalizedText, Resume } from './resume';

/**
 * Template plug-in contract (spec §7.1). Core hands data in; templates never
 * import app internals, the store, or other templates. The SAME component
 * serves both the live HTML preview and the export PDF (via react-pdf-html).
 */
export interface TemplateProps {
  /** §13 resume data. */
  resume: Resume;
  /** Localized section headings, driven by `resume.locale`. */
  t: (key: string) => string;
  /** dayjs-backed date formatter. `fmt` is a dayjs format string. */
  formatDate: (iso: string, fmt?: string) => string;
}

/** A template's default export: a pure function of resume data returning HTML. */
export type ResumeTemplate = (props: TemplateProps) => JSX.Element;

/**
 * Top and bottom page margin, in points.
 *
 * Vertical breathing room MUST live here rather than as padding on a template's
 * root element: padding applies to a block once, so on a CV that runs to a
 * second page the content of every page after the first starts hard against the
 * paper edge. This is applied to react-pdf's `Page` (which re-applies it per
 * page) and to the preview canvas, keeping the two identical. Horizontal
 * padding has no such problem and stays in the template's own styles.
 */
export interface PageMargin {
  top: number;
  bottom: number;
}

/** Metadata each template folder exports (`manifest.ts`). */
export interface TemplateManifest {
  /** MUST equal the folder name. */
  id: string;
  /** Display name per locale; only `az` is required (the rest fall back to it). */
  name: LocalizedText;
  /** `true` = single column, image-free, real-text (safe for ATS parsing). */
  atsSafe: boolean;
  /** Primary colour for the picker swatch. */
  accent?: string;
  /** Imported thumbnail asset URL. */
  thumbnail: string;
  /** Per-page vertical margin. Omitted = none (the template pads itself). */
  pageMargin?: PageMargin;
}

/** A registry entry: eager manifest + lazy component loader. */
export interface RegisteredTemplate {
  manifest: TemplateManifest;
  /** Code-split loader for the template component. */
  load: () => Promise<{ default: ResumeTemplate }>;
}
