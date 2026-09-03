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
  /**
   * Localized section headings, driven by `resume.locale`.
   *
   * `count` is passed straight to i18next, which picks the CLDR plural category
   * for THAT locale — the age unit is the only place it is needed, and it is not
   * optional there: Russian wants `год`/`года`/`лет` and Polish `rok`/`lata`/`lat`
   * for numbers inside the 16–100 range a CV actually prints.
   */
  t: (key: string, options?: { count?: number }) => string;
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

/**
 * A solid colour column running the full height of EVERY page, behind the
 * content — the modern template's accent sidebar.
 *
 * Declared here rather than drawn by the template, because it is the one piece of
 * a template that cannot be expressed as an element in the flow. It has to reach
 * the paper edges, so it must escape `pageMargin`; and it has to repeat on page
 * 2, which only a page-level element does. It used to be an absolutely positioned
 * div inside the template marked `data-page-bleed`, which core turned into a
 * `fixed` View — that worked until `@react-pdf` v4 stopped repeating `fixed`
 * nodes nested inside the parsed-markup wrapper, and the column vanished from
 * every page but the first.
 *
 * As a manifest field, core paints it as a direct child of the page in BOTH
 * targets from one declaration, so the preview and the export cannot disagree,
 * and no template needs to know how pagination works.
 */
export interface PageBleed {
  /** Column width — a percentage of the page width, or points. */
  width: string | number;
  /** Fill colour. */
  color: string;
  /** Which edge it hugs; defaults to the left. */
  side?: 'left' | 'right';
}

/** Metadata each template folder exports (`manifest.ts`). */
export interface TemplateManifest {
  /** MUST equal the folder name. */
  id: string;
  /** Display name per locale; only `az` is required (the rest fall back to it). */
  name: LocalizedText;
  /** `true` = single column, image-free, real-text (safe for ATS parsing). */
  atsSafe: boolean;
  /** Primary colour; the picker draws the selected card's ring with it. */
  accent?: string;
  /** Imported thumbnail asset URL. */
  thumbnail: string;
  /** Per-page vertical margin. Omitted = none (the template pads itself). */
  pageMargin?: PageMargin;
  /** Full-height accent column painted behind the content on every page. */
  pageBleed?: PageBleed;
}

/** A registry entry: eager manifest + lazy component loader. */
export interface RegisteredTemplate {
  manifest: TemplateManifest;
  /** Code-split loader for the template component. */
  load: () => Promise<{ default: ResumeTemplate }>;
}
