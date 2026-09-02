import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type {
  Certification,
  EducationItem,
  ExperienceItem,
  Resume,
  ResumeListSection,
} from '../types/resume';
import type { RegisteredTemplate } from '../types/template';
import { fullResume } from '../test/fixtures/full-resume';
import { makeDateFormatter } from './date';
import { i18n } from '../app/i18n';
import { listTemplates } from '../templates/_core/registry';
import {
  HISTORY_SECTIONS,
  isAutoOrdered,
  isHistorySection,
  sortByRecency,
  sortResumeHistory,
  withManualOrder,
} from './sort-history';

/**
 * Reverse-chronological order for the dated sections.
 *
 * The comparator cases are worth pinning individually — "newest first" is not a
 * single rule but four (ongoing, end date, start date, undated) — but the test
 * that matters is the last block: order only means something if the templates
 * print the entries in it, and they are given no code to do so.
 */

const exp = (id: string, startDate: string, endDate?: string, current = false): ExperienceItem => ({
  id,
  company: `Company ${id}`,
  position: 'Developer',
  startDate,
  endDate,
  current,
});

const edu = (id: string, startDate: string, endDate?: string): EducationItem => ({
  id,
  type: 'university',
  institution: `School ${id}`,
  startDate,
  endDate,
  current: false,
});

const cert = (id: string, issueDate: string, expirationDate?: string): Certification => ({
  id,
  name: `Course ${id}`,
  organization: 'Org',
  issueDate,
  expirationDate,
});

const ids = (items: readonly { id: string }[]): string[] => items.map((x) => x.id);

describe('sortByRecency', () => {
  it('puts an ongoing entry above everything that has ended', () => {
    const finishedLater = exp('ended', '2010-01-01', '2026-08-31');
    const ongoing = exp('ongoing', '2015-03-01', undefined, true);
    expect(ids(sortByRecency([finishedLater, ongoing]))).toEqual(['ongoing', 'ended']);
  });

  /**
   * The reason the END date leads the sort key. A long job still running has to
   * outrank a short one that started later and finished — which is exactly the
   * case a start-date sort gets wrong, and the common one (a career job with a
   * secondment inside it).
   */
  it('orders by end date, not by start date', () => {
    const long = exp('long', '2015-01-01', '2026-01-31');
    const laterButShorter = exp('short', '2020-01-01', '2022-01-31');
    expect(ids(sortByRecency([laterButShorter, long]))).toEqual(['long', 'short']);
  });

  it('breaks a tie on the end date with the start date', () => {
    const early = exp('early', '2018-01-01', '2024-06-30');
    const late = exp('late', '2022-01-01', '2024-06-30');
    expect(ids(sortByRecency([early, late]))).toEqual(['late', 'early']);
  });

  /**
   * Stability is the answer here, not a fallback: two entries the dates cannot
   * separate keep the order the user typed them in, which is the only remaining
   * signal about which they consider more important.
   */
  it('keeps the typed order for entries the dates cannot separate', () => {
    const first = exp('first', '2020-01-01', '2022-01-01');
    const second = exp('second', '2020-01-01', '2022-01-01');
    const third = exp('third', '2020-01-01', '2022-01-01');
    expect(ids(sortByRecency([first, second, third]))).toEqual(['first', 'second', 'third']);
    expect(ids(sortByRecency([third, first, second]))).toEqual(['third', 'first', 'second']);
  });

  /**
   * `startDate` is required by every dated section's yup schema, so an undated
   * entry is a malformed or half-migrated record rather than something the editor
   * produces. It must still land somewhere sensible — and the bottom is sensible,
   * whereas the top would put an entry nobody dated above a current job.
   */
  it('sends an entry with no usable date to the end', () => {
    const dated = exp('dated', '2019-01-01', '2020-01-01');
    const undated = exp('undated', '');
    const nonsense = exp('nonsense', 'yesterday');
    expect(ids(sortByRecency([undated, nonsense, dated]))).toEqual([
      'dated',
      'undated',
      'nonsense',
    ]);
  });

  it('places an entry with a start date but no end date at its start date', () => {
    const openEnded = exp('open', '2021-05-01');
    const older = exp('older', '2018-01-01', '2019-01-01');
    const newer = exp('newer', '2023-01-01', '2024-01-01');
    expect(ids(sortByRecency([older, openEnded, newer]))).toEqual(['newer', 'open', 'older']);
  });

  /**
   * The sections store different precisions — `YYYY-MM-DD` for experience,
   * `YYYY-MM` for education and certificates — and a bare lexical compare would
   * separate them only by accident of string length. Asserted on education, whose
   * values are the short form.
   */
  it('compares month-precision dates correctly', () => {
    const items = [edu('c', '2010-09', '2014-06'), edu('a', '2018-09', '2022-06')];
    expect(ids(sortByRecency(items))).toEqual(['a', 'c']);
    // A month-only value sits just below the first day of its own month, so a
    // mixed-precision pair still resolves rather than comparing equal.
    const mixed = [edu('month', '2020-01', '2024-06'), edu('day', '2020-01', '2024-06-15')];
    expect(ids(sortByRecency(mixed))).toEqual(['day', 'month']);
  });

  /**
   * A certificate is a point in time, so it is placed by when it was EARNED.
   * `expirationDate` describes the certificate, not a position in a history — an
   * old certificate with a distant expiry must not outrank a recent one.
   */
  it('orders certificates by issue date and ignores the expiry', () => {
    const old = cert('old', '2019-03', '2099-01');
    const recent = cert('recent', '2025-11');
    expect(ids(sortByRecency([old, recent]))).toEqual(['recent', 'old']);
  });

  it('does not mutate the array it was given', () => {
    const items = [exp('a', '2019-01-01', '2020-01-01'), exp('b', '2023-01-01', '2024-01-01')];
    sortByRecency(items);
    expect(ids(items)).toEqual(['a', 'b']);
  });
});

describe('HISTORY_SECTIONS', () => {
  it('names the dated sections and nothing else', () => {
    expect([...HISTORY_SECTIONS]).toEqual(['experience', 'education', 'certifications']);
  });

  /**
   * The other four carry no date at all, so there is nothing to derive an order
   * from — their order is an editorial choice (strongest language first, most
   * relevant skill first) and stays the user's.
   */
  it('excludes the sections that have no date', () => {
    const undated: ResumeListSection[] = ['skills', 'languages', 'interests', 'projects'];
    for (const section of undated) expect(isHistorySection(section)).toBe(false);
    for (const section of HISTORY_SECTIONS) expect(isHistorySection(section)).toBe(true);
  });
});

describe('sortResumeHistory', () => {
  /**
   * The fixture is a real CV, and its education list is the case that motivates
   * an end-date sort: a bachelor's degree ran 2006–2009 with a four-month course
   * inside it in 2007, so the course is typed after the degree but ended first.
   */
  it('reorders the real fixture where the typed order is not chronological', () => {
    const resume = fullResume();
    expect(ids(resume.education)).toEqual(['e1', 'e2', 'e3', 'e4']);
    expect(ids(sortResumeHistory(resume).education)).toEqual(['e1', 'e2', 'e4', 'e3']);
  });

  it('leaves a section that is already in order identical, by identity', () => {
    const resume = fullResume();
    const sorted = sortResumeHistory(resume);
    expect(sorted.experience).toBe(resume.experience);
    expect(sorted.certifications).toBe(resume.certifications);
  });

  /**
   * Returning the very same object when nothing moves is what keeps the memoized
   * preview from re-rendering, so it is asserted by identity rather than by a
   * deep comparison — which would pass either way.
   */
  it('returns the very same resume when nothing moves', () => {
    const resume = sortResumeHistory(fullResume());
    expect(sortResumeHistory(resume)).toBe(resume);
  });

  it('does not mutate the resume it was given', () => {
    const resume = fullResume();
    sortResumeHistory(resume);
    expect(ids(resume.education)).toEqual(['e1', 'e2', 'e3', 'e4']);
  });

  it('sorts every dated section and touches no other list', () => {
    const resume: Resume = {
      ...fullResume(),
      experience: [
        exp('old', '2010-01-01', '2012-01-01'),
        exp('new', '2020-01-01', undefined, true),
      ],
      education: [edu('old', '2005-09', '2009-06'), edu('new', '2015-09', '2019-06')],
      certifications: [cert('old', '2015-01'), cert('new', '2024-01')],
    };
    const sorted = sortResumeHistory(resume);
    expect(ids(sorted.experience)).toEqual(['new', 'old']);
    expect(ids(sorted.education)).toEqual(['new', 'old']);
    expect(ids(sorted.certifications ?? [])).toEqual(['new', 'old']);
    // The undated lists keep the user's arrangement.
    expect(sorted.skills).toBe(resume.skills);
    expect(sorted.languages).toBe(resume.languages);
    expect(sorted.interests).toBe(resume.interests);
  });

  it('survives a resume with no certifications at all', () => {
    const resume: Resume = { ...fullResume(), certifications: undefined };
    // `undefined`, not `[]`: an absent section must stay absent, or a template
    // that distinguishes the two would start printing an empty heading.
    expect(sortResumeHistory(resume).certifications).toBeUndefined();
  });

  describe('manualOrder', () => {
    const scrambled = (): Resume => ({
      ...fullResume(),
      experience: [exp('old', '2010-01-01', '2012-01-01'), exp('new', '2020-01-01', '2024-01-01')],
      education: [edu('old', '2005-09', '2009-06'), edu('new', '2015-09', '2019-06')],
    });

    it('leaves a hand-arranged section exactly as stored', () => {
      const resume: Resume = { ...scrambled(), manualOrder: ['experience'] };
      const sorted = sortResumeHistory(resume);
      expect(sorted.experience).toBe(resume.experience);
      expect(ids(sorted.experience)).toEqual(['old', 'new']);
      // Per section, not per resume: education is still sorted.
      expect(ids(sorted.education)).toEqual(['new', 'old']);
    });

    it('reads an absent flag as "sort it" (opt-out)', () => {
      const resume = scrambled();
      expect(resume.manualOrder).toBeUndefined();
      for (const section of HISTORY_SECTIONS) expect(isAutoOrdered(resume, section)).toBe(true);
      expect(isAutoOrdered({ ...resume, manualOrder: [] }, 'experience')).toBe(true);
      expect(isAutoOrdered({ ...resume, manualOrder: ['experience'] }, 'experience')).toBe(false);
    });

    it('adds, removes and stays idempotent', () => {
      expect(withManualOrder(undefined, 'experience', true)).toEqual(['experience']);
      expect(withManualOrder(['experience'], 'experience', true)).toEqual(['experience']);
      expect(withManualOrder(['experience', 'education'], 'experience', false)).toEqual([
        'education',
      ]);
      expect(withManualOrder(undefined, 'experience', false)).toEqual([]);
    });
  });
});

/**
 * The invariant no comment can enforce, and the one whose breach is silent:
 * delete the projection from `services/pdf.ts` and the DOWNLOADED CV goes back
 * to whatever order it was typed in, with every other test in this file — which
 * composes the projection itself — still green.
 *
 * `exportResumePdf` cannot be driven from a test (it ends in `toBlob` and a
 * download), so the source is the assertion. Read through Vite's own
 * `import.meta.glob(…, '?raw')` rather than `node:fs`, because `@types/node` is
 * deliberately not a dependency (§27) — the same mechanism `consent.test.ts` and
 * the template registry use. Comment lines are stripped first, since both files
 * name the projection in prose.
 */
describe('the two composition points', () => {
  const sources = import.meta.glob('/src/**/*.{ts,tsx}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  const PREVIEW = '/src/hooks/useLocalizedResume.ts';
  const EXPORT = '/src/services/pdf.ts';
  /** Both targets must apply the two order-free projections the same way round. */
  const COMPOSITION = 'sortResumeHistory(applyFieldVisibility(';

  const strip = (code: string): string =>
    code
      .split('\n')
      .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line))
      .join('\n');

  it('applies the projection in the preview and in the export alike', () => {
    // The glob has to have found the app, or this asserts nothing at all.
    expect(Object.keys(sources).length).toBeGreaterThan(50);

    for (const path of [PREVIEW, EXPORT]) {
      const body = strip(sources[path] ?? '');
      expect(body, `${path} is not in the glob`).not.toBe('');
      expect(
        body.split(COMPOSITION).length - 1,
        `${path} must compose the projections exactly once, as "${COMPOSITION}…"`,
      ).toBe(1);
      // …and localize the projected resume, not the raw one.
      expect(body, `${path} must still localize`).toContain('localizeResume(');
    }
  });

  /**
   * And nowhere else. A third caller would be a section reordered behind the
   * templates' back — the preview and the export would still agree with each
   * other while disagreeing with the editor list beside them.
   */
  it('is called from those two places and no others', () => {
    const callers = Object.entries(sources)
      .filter(([path]) => !/\.test\.tsx?$/.test(path) && path !== '/src/utils/sort-history.ts')
      .filter(([, code]) => strip(code).includes('sortResumeHistory('))
      .map(([path]) => path)
      .sort();
    expect(callers).toEqual([PREVIEW, EXPORT].sort());
  });
});

/**
 * End to end, through the components that actually draw the CV. Templates need
 * no code for this — the order is a projection over the array they iterate — so
 * this is also the test that keeps a template added LATER honest.
 *
 * The employers are sentinels rather than the fixture's real ones: what is being
 * asserted is a POSITION, and a name that appears anywhere else in the document
 * (a company that is also a certificate issuer, say) would make `indexOf` lie.
 */
describe('the rendered CV', () => {
  const t = i18n.getFixedT('az');
  const formatDate = makeDateFormatter('az');

  /** Oldest first — what someone filling the form in from the beginning types. */
  const TYPED = [
    { id: 'j4', company: 'Employer-oldest-4f1c', startDate: '2011-09-10', endDate: '2016-07-31' },
    { id: 'j3', company: 'Employer-third-4f1c', startDate: '2016-08-15', endDate: '2019-11-30' },
    { id: 'j2', company: 'Employer-second-4f1c', startDate: '2019-12-01', endDate: '2021-12-31' },
    { id: 'j1', company: 'Employer-newest-4f1c', startDate: '2022-01-01', endDate: undefined },
  ];

  const probe = (manualOrder?: Resume['manualOrder']): Resume => {
    const resume = fullResume();
    return {
      ...resume,
      manualOrder,
      experience: TYPED.map((job, i) => ({
        ...resume.experience[0],
        ...job,
        current: i === TYPED.length - 1,
      })),
    };
  };

  const markup = async (resume: Resume, load: RegisteredTemplate['load']): Promise<string> => {
    const Template = (await load()).default;
    return renderToStaticMarkup(
      createElement(Template, { resume: sortResumeHistory(resume), t, formatDate }),
    );
  };

  /** Where each employer appears in the markup, in the order it was typed. */
  const positions = (html: string): number[] => TYPED.map((job) => html.indexOf(job.company));

  for (const { manifest, load } of listTemplates()) {
    it(`"${manifest.id}" prints a history typed oldest-first newest-first`, async () => {
      const found = positions(await markup(probe(), load));
      expect(found, 'every employer has to reach the page').not.toContain(-1);
      // Typed oldest→newest, so the printed positions must run the other way.
      expect(found).toEqual([...found].sort((a, b) => b - a));
    });

    it(`"${manifest.id}" honours a hand-arranged history`, async () => {
      const found = positions(await markup(probe(['experience']), load));
      expect(found).not.toContain(-1);
      expect(found).toEqual([...found].sort((a, b) => a - b));
    });
  }
});
