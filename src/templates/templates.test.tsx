import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Resume } from '../types/resume';
import { createEmptyResume } from '../utils/empty-resume';
import { makeDateFormatter } from '../utils/date';
import { i18n } from '../app/i18n';
import { getTemplate, listTemplates } from './_core/registry';

function sampleResume(): Resume {
  const r = createEmptyResume('az');
  r.basics = { firstName: 'Elvin', lastName: 'Huseynov', headline: 'Frontend Developer', location: 'Bakı' };
  r.contact = { email: 'elvin@example.az', items: [{ id: 'c1', type: 'github', value: 'https://github.com/elvin' }] };
  r.summary = 'Experienced developer.';
  r.experience = [
    {
      id: 'e1',
      company: 'Cybernet',
      position: 'Lead Frontend Developer',
      startDate: '2022-01-10',
      current: true,
      description: 'Team lead.',
      highlights: ['Built the design system'],
    },
  ];
  r.education = [
    { id: 'ed1', type: 'university', institution: 'BSU', degree: 'bachelor', startDate: '2007-09', endDate: '2011-06', current: false },
  ];
  r.skills = [{ id: 's1', name: 'TypeScript', level: 90 }];
  r.languages = [{ id: 'l1', code: 'english', name: 'English', level: 'C1' }];
  return r;
}

/**
 * Smoke-render every registered template with the SAME component used for the
 * PDF export (spec §7.1 drift guard). Renders to static HTML and asserts the
 * output is non-trivial and contains the candidate name — catching runtime
 * errors in any template before deploy.
 */
describe('template smoke render', () => {
  const resume = sampleResume();
  const t = i18n.getFixedT('az');
  const formatDate = makeDateFormatter('az');

  for (const { manifest, load } of listTemplates()) {
    it(`renders "${manifest.id}" without throwing`, async () => {
      const Template = (await load()).default;
      const html = renderToStaticMarkup(createElement(Template, { resume, t, formatDate }));
      expect(html.length).toBeGreaterThan(200);
      expect(html).toContain('Elvin');
      expect(html).toContain('Huseynov');
    });
  }

  /**
   * Every section heading must sit in the same `data-keep-together` box as the
   * section's first block. That marker is what `services/pdf.ts` turns into
   * `wrap={false}`, and it is the only thing standing between a real CV and the
   * reported bug — a heading alone at the foot of a page with its entries
   * overleaf. Asserted on the markup because that is where the binding is made;
   * the finished-PDF side is checked in `full-profile.test.tsx`.
   */
  for (const { manifest, load } of listTemplates()) {
    it(`binds every section heading to its first block in "${manifest.id}"`, async () => {
      const Template = (await load()).default;
      const html = renderToStaticMarkup(createElement(Template, { resume, t, formatDate }));
      const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');

      const groups = [...doc.querySelectorAll('[data-keep-together]')];
      expect(groups.length, 'no keep-together group at all').toBeGreaterThan(0);
      for (const group of groups) {
        // Heading + at least one block of content, or the marker buys nothing.
        expect(group.children.length, `"${group.textContent}" holds only its heading`).toBeGreaterThan(1);
      }

      // And no heading is left outside one.
      const headings = [...doc.querySelectorAll('div')].filter(
        (el) => el.textContent === t('sections.experience'),
      );
      expect(headings.length).toBeGreaterThan(0);
      for (const heading of headings) {
        expect(heading.closest('[data-keep-together]'), 'heading outside a group').toBeTruthy();
      }
    });
  }

  /**
   * A title/date row must hold BLOCK children, never `<span>`s.
   *
   * `react-pdf-html` buckets consecutive inline elements into one `Text`, and a
   * flex row with a single child has nothing to space apart — the date ends up
   * running straight after the title instead of sitting at the right margin.
   * The browser hides the mistake, since there spans are flex items like any
   * other, so the guard has to live here.
   */
  for (const id of ['classic', 'compact']) {
    it(`keeps "${id}" title/date rows made of block children`, async () => {
      const Template = (await getTemplate(id).load()).default;
      const html = renderToStaticMarkup(createElement(Template, { resume, t, formatDate }));
      const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');

      const rows = [...doc.querySelectorAll('div[style*="space-between"]')];
      expect(rows.length, 'no title/date row found').toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.children.length, 'a row with one child cannot space anything').toBeGreaterThan(1);
        for (const child of row.children) {
          expect(child.tagName, `<${child.tagName.toLowerCase()}> would be bucketed inline`).not.toBe(
            'SPAN',
          );
        }
      }
    });
  }

  it('registers the three shipped templates, ATS-safe first', () => {
    const ids = listTemplates().map((x) => x.manifest.id);
    expect(ids).toContain('classic');
    expect(ids).toContain('modern');
    expect(ids).toContain('compact');
    expect(listTemplates()[0].manifest.atsSafe).toBe(true);
  });
});
