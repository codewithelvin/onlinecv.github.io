import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Resume } from '../types/resume';
import { createEmptyResume } from '../utils/empty-resume';
import { makeDateFormatter } from '../utils/date';
import { i18n } from '../app/i18n';
import { listTemplates } from './_core/registry';

/**
 * Right-to-left BLOCK layout, asserted on the markup both renderers consume.
 *
 * react-pdf never sets Yoga's direction and supports no logical properties, so
 * none of this happens on its own — the templates mirror explicitly via
 * `mirrorRow`. The preview must therefore NOT also set a CSS `direction`, or it
 * mirrors a second time and lands back where it started; `A4Frame.test.tsx`
 * guards that half, and this one guards that the mirroring is in the markup at
 * all.
 */
function resumeIn(locale: Resume['locale']): Resume {
  const r = createEmptyResume(locale);
  r.basics = { firstName: 'محمد', lastName: 'العلي', headline: 'مطور' };
  r.contact = { email: 'm@example.az', items: [] };
  r.skills = [{ id: 's1', name: 'جافاسكريبت', level: 80 }];
  r.experience = [
    {
      id: 'x1',
      company: 'شركة',
      position: 'مطور',
      startDate: '2022-01-01',
      current: true,
      highlights: ['إعادة بناء البوابة'],
    },
  ];
  return r;
}

async function markup(templateId: string, locale: Resume['locale']): Promise<string> {
  const entry = listTemplates().find((e) => e.manifest.id === templateId)!;
  const Template = (await entry.load()).default;
  const resume = resumeIn(locale);
  return renderToStaticMarkup(
    createElement(Template, {
      resume,
      t: i18n.getFixedT(locale),
      formatDate: makeDateFormatter(locale),
    }),
  );
}

/** Inline styles on every element, as `style="…"` strings. */
const styles = (html: string): string[] =>
  [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1]);

describe('right-to-left block layout', () => {
  for (const { manifest } of listTemplates()) {
    it(`mirrors rows in "${manifest.id}" for Arabic and not for Azerbaijani`, async () => {
      const rtl = styles(await markup(manifest.id, 'ar'));
      const ltr = styles(await markup(manifest.id, 'az'));
      expect(rtl.some((s) => s.includes('row-reverse'))).toBe(true);
      expect(ltr.some((s) => s.includes('row-reverse'))).toBe(false);
    });
  }

  /**
   * The reported symptom: the accent column moved to the right while the sidebar
   * stayed on the left. The column is core's (`manifest.pageBleed` + `bleedSide`),
   * so the template's job is to put the sidebar on the same side — which for the
   * modern template means its ROOT row is the mirrored one.
   */
  it('mirrors the modern root row, so the sidebar meets its accent column', async () => {
    const html = await markup('modern', 'ar');
    const root = html.match(/^<div style="([^"]*)"/)?.[1];
    expect(root, 'modern root has no inline style').toBeDefined();
    expect(root).toContain('row-reverse');
  });

  /**
   * A bullet's marker belongs on the reading side of its text, and the list's
   * indent on the reading side of the block. `BulletList` owns both.
   */
  it('puts bullet markers and their indent on the reading side', async () => {
    for (const { manifest } of listTemplates()) {
      const rtl = styles(await markup(manifest.id, 'ar'));
      const ltr = styles(await markup(manifest.id, 'az'));
      // The indent moves from padding-left to padding-right.
      expect(
        rtl.some((s) => /padding-right:\s*\d/.test(s)),
        `${manifest.id}: bullet indent did not move`,
      ).toBe(true);
      expect(ltr.some((s) => /padding-left:\s*\d/.test(s))).toBe(true);
    }
  });

  /** Nothing in a template may declare a writing direction — see the guard above. */
  it('has no template declaring a CSS direction', async () => {
    for (const { manifest } of listTemplates()) {
      for (const locale of ['ar', 'az'] as const) {
        const html = await markup(manifest.id, locale);
        expect(html, `${manifest.id} (${locale})`).not.toMatch(/direction:\s*(rtl|ltr)/);
      }
    }
  });
});
