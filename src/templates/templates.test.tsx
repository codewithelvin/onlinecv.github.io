import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Resume } from '../types/resume';
import { createEmptyResume } from '../utils/empty-resume';
import { makeDateFormatter } from '../utils/date';
import { i18n } from '../app/i18n';
import { listTemplates } from './_core/registry';

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

  it('registers the three shipped templates, ATS-safe first', () => {
    const ids = listTemplates().map((x) => x.manifest.id);
    expect(ids).toContain('classic');
    expect(ids).toContain('modern');
    expect(ids).toContain('compact');
    expect(listTemplates()[0].manifest.atsSafe).toBe(true);
  });
});
