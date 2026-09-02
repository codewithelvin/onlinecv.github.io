import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ContactItem, Resume } from '../types/resume';
import { createEmptyResume } from '../utils/empty-resume';
import { makeDateFormatter } from '../utils/date';
import { i18n } from '../app/i18n';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../app/i18n/locales';
import { getTemplate, listTemplates } from './_core/registry';

function sampleResume(): Resume {
  const r = createEmptyResume('az');
  r.basics = {
    firstName: 'Elvin',
    lastName: 'Huseynov',
    headline: 'Frontend Developer',
    location: 'Bakı',
  };
  r.contact = {
    email: 'elvin@example.az',
    items: [{ id: 'c1', type: 'github', value: 'https://github.com/elvin' }],
  };
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
    {
      id: 'ed1',
      type: 'university',
      institution: 'BSU',
      degree: 'bachelor',
      startDate: '2007-09',
      endDate: '2011-06',
      current: false,
    },
  ];
  r.skills = [{ id: 's1', name: 'TypeScript', level: 90 }];
  r.languages = [{ id: 'l1', code: 'english', name: 'English', level: 'C1' }];
  return r;
}

/**
 * A template names itself in every UI language.
 *
 * `TemplateManifest.name` is a PARTIAL record — deliberately, so that adding a
 * locale does not break every existing template folder at compile time — and the
 * picker falls back to Azerbaijani for anything missing. That fallback is silent,
 * and it rotted exactly as you would expect: at 2026-09-02 `classic`, `compact`
 * and `modern` still carried the six languages they shipped with, so fourteen
 * locales were offered "Klassik", "Yığcam" and "Müasir"; the three templates
 * added later had nineteen and lacked only the Japanese added after them.
 * Forty-five gaps, and not one gate noticed.
 *
 * So the totality the type gives up is asserted here instead — the same bargain
 * `datasets.test.ts` strikes for dictionary labels, and for the same reason: the
 * fallback is a word shown to someone who cannot read the language it came from.
 */
describe('template names', () => {
  for (const { manifest } of listTemplates()) {
    it(`names "${manifest.id}" in every UI language`, () => {
      const missing = SUPPORTED_LOCALES.filter((locale) => !manifest.name[locale]?.trim());
      expect(missing, `"${manifest.id}" falls back to ${DEFAULT_LOCALE} in these locales`).toEqual(
        [],
      );
    });
  }
});

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
        expect(
          group.children.length,
          `"${group.textContent}" holds only its heading`,
        ).toBeGreaterThan(1);
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
        expect(row.children.length, 'a row with one child cannot space anything').toBeGreaterThan(
          1,
        );
        for (const child of row.children) {
          expect(
            child.tagName,
            `<${child.tagName.toLowerCase()}> would be bucketed inline`,
          ).not.toBe('SPAN');
        }
      }
    });
  }

  /**
   * No template may use `<ul>`/`<li>`.
   *
   * `react-pdf-html` hides the marker box under `resetStyles` but react-pdf
   * still PAINTS the "•" — at the row's origin, on top of the text. Bullets go
   * through `templates/_core/bullets` instead, which draws two explicit boxes;
   * the resulting geometry is asserted in `templates.pdf.test.tsx`.
   */
  for (const { manifest, load } of listTemplates()) {
    it(`draws "${manifest.id}" bullets without a real list element`, async () => {
      const Template = (await load()).default;
      const html = renderToStaticMarkup(createElement(Template, { resume, t, formatDate }));
      // The sample CV has a highlight, so a marker must be somewhere in there.
      expect(html, 'no bullet marker rendered — the guard would pass vacuously').toContain('•');
      expect(html).not.toMatch(/<(ul|ol|li)[\s>]/);
    });
  }

  /**
   * NO TEMPLATE MAY `text-transform` THE USER'S OWN WORDS.
   *
   * Upper-casing is for strings the APP owns — section titles, field labels — and
   * it is a real temptation, because print résumé designs set the candidate's name
   * in caps and two of the three open-source layouts this app adapted do exactly
   * that. Copying it breaks two things at once:
   *
   *  1. The PDF's text layer carries the TRANSFORMED string, so an ATS (and
   *     anyone copy-pasting) reads back `ИВАН ПЕТРОВ` from a CV that says
   *     `Иван Петров` — a name nobody wrote. Caught by `text-fidelity.test.tsx`,
   *     but only for the five locales that file renders.
   *  2. `toUpperCase()` on Georgian maps Mkhedruli to MTAVRULI (U+1C90–1CBF),
   *     which Georgian orthography uses for whole words only — so it is not a
   *     capitalized name, it is a misspelt one. Exactly the trap
   *     `LocaleMeta.capitalizeMonths` exists to keep month names out of.
   *
   * Checked here rather than left to the fidelity test because this runs against
   * EVERY registered template on plain markup, in milliseconds — so a template
   * added later cannot reintroduce it, whichever locale it was designed in.
   */
  for (const { manifest, load } of listTemplates()) {
    it(`never text-transforms user content in "${manifest.id}"`, async () => {
      const Template = (await load()).default;
      const html = renderToStaticMarkup(createElement(Template, { resume, t, formatDate }));
      const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');

      // Values the USER typed, as opposed to anything `t()` returned.
      const userText = [
        resume.basics.firstName,
        resume.basics.lastName,
        resume.basics.headline,
        resume.basics.location,
        resume.summary,
        resume.experience[0].company,
        resume.experience[0].position,
        resume.education[0].institution,
        resume.skills[0].name,
        resume.languages[0].name,
      ].filter((value): value is string => Boolean(value));

      const transformed = (el: Element): boolean =>
        /text-transform:\s*(uppercase|lowercase|capitalize)/i.test(el.getAttribute('style') ?? '');

      for (const el of doc.querySelectorAll('*')) {
        // Only the element that actually holds the text — an ancestor carrying the
        // declaration is caught when the walk reaches it, and `text-transform`
        // inherits, so checking self plus ancestors would double-report.
        const own = [...el.childNodes]
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent ?? '')
          .join('');
        const hit = userText.find((value) => own.includes(value));
        if (!hit) continue;
        for (let node: Element | null = el; node; node = node.parentElement) {
          expect(
            transformed(node) ? `"${hit}" is text-transformed by <${node.tagName}>` : null,
          ).toBeNull();
        }
      }
    });
  }

  /**
   * Every contact channel that HAS a target is an anchor, in every template.
   *
   * Driven by `listTemplates()`, so a template added later cannot quietly ship a
   * dead contact line: the hrefs come from core (`contactHref`), a template's
   * only job is to wrap the value, and this proves it did. The check on the
   * printed text is the other half — what an ATS reads must be exactly what it
   * read before any of this became clickable.
   */
  for (const { manifest, load } of listTemplates()) {
    it(`links every contact channel in "${manifest.id}"`, async () => {
      const linked: Resume = {
        ...resume,
        contact: {
          email: 'elvin@example.az',
          items: [
            { id: 'c1', type: 'mobile', value: '+994501234567' },
            { id: 'c2', type: 'whatsapp', value: '+994551234567' },
            { id: 'c3', type: 'telegram', value: '@elvin' },
            { id: 'c4', type: 'address', value: 'Bakı, Nizami küç. 1' },
          ],
        },
        // The other two anchors a template can draw, so the style rule below is
        // checked against every `<a>` a CV can contain, not just the new ones.
        projects: [{ id: 'p1', name: 'Portfolio', url: 'https://elvin.dev' }],
        certifications: [
          {
            id: 'cert1',
            name: 'Advanced TypeScript',
            organization: 'Udemy',
            issueDate: '2023-05',
            credentialUrl: 'https://cert.example/1',
          },
        ],
      };
      const Template = (await load()).default;
      const html = renderToStaticMarkup(createElement(Template, { resume: linked, t, formatDate }));
      const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
      const anchors = [...doc.querySelectorAll('a')];
      const hrefs = anchors.map((a) => a.getAttribute('href'));

      expect(hrefs).toContain('mailto:elvin@example.az');
      expect(hrefs).toContain('tel:+994501234567');
      expect(hrefs).toContain('https://wa.me/994551234567');
      expect(hrefs).toContain('https://t.me/elvin');

      // The printed strings are untouched — a link ON the CV, not a rewrite OF it.
      expect(doc.body.textContent).toContain('+994501234567');
      expect(doc.body.textContent).toContain('Bakı, Nizami küç. 1');
      // …and a postal address has no target, so it stays plain text.
      expect(anchors.find((a) => a.textContent?.includes('Nizami'))).toBeUndefined();

      /**
       * No template may emit an UNSTYLED anchor. `react-pdf-html` keeps its own
       * `a { textDecoration: underline }` through `resetStyles`, and a browser
       * paints a bare anchor blue — either way the line would stop matching the
       * design it was drawn for.
       */
      for (const a of anchors) {
        expect(
          a.getAttribute('style') ?? '',
          `<a href="${a.getAttribute('href')}"> carries no style`,
        ).toContain('text-decoration:none');
      }
    });
  }

  /**
   * Every contact channel carries the mark that says WHICH channel it is, in
   * every template — and nothing else on the CV does.
   *
   * The second half is the part worth having. The marks are the only artwork on a
   * résumé besides the avatar, and the rule is that they belong to contacts and
   * to nothing else: a mark beside a section heading or a skill would be a
   * picture where an ATS expects a word. Counting them against the channels is
   * what makes "only contacts" checkable rather than a comment.
   */
  for (const { manifest, load } of listTemplates()) {
    it(`marks every contact channel, and only those, in "${manifest.id}"`, async () => {
      const channels: ContactItem[] = [
        { id: 'c1', type: 'mobile', value: '+994501234567' },
        { id: 'c2', type: 'landline', value: '+994124985225' },
        { id: 'c3', type: 'whatsapp', value: '+994551234567' },
        { id: 'c4', type: 'telegram', value: '@elvin' },
        { id: 'c5', type: 'address', value: 'Bakı, Nizami küç. 1' },
      ];
      const marked: Resume = {
        ...resume,
        contact: { email: 'elvin@example.az', items: channels },
      };
      const Template = (await load()).default;
      const html = renderToStaticMarkup(createElement(Template, { resume: marked, t, formatDate }));
      const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
      const marks = [...doc.querySelectorAll('[data-contact-icon]')];

      // The primary email is a channel too (see `contactChannels`).
      expect(marks.map((m) => m.getAttribute('data-contact-icon'))).toEqual([
        'email',
        ...channels.map((c) => c.type),
      ]);
      // Including the one with no link — a postal address still says it is one.
      expect(marks).toHaveLength(channels.length + 1);

      for (const mark of marks) {
        const style = mark.getAttribute('style') ?? '';
        expect(style, 'a mark with no artwork is an empty box').toContain(
          'background:url(data:image/png;base64,',
        );
        /*
         * Childless, and this is load-bearing rather than tidy: `react-pdf-html`
         * reads an element's children to decide inline-versus-block, so an `<img>`
         * or `<svg>` in here would turn the mark into block content and break the
         * contact line into stacked fragments in the exported PDF.
         */
        expect(mark.childNodes, 'a mark must be an empty span').toHaveLength(0);
      }

      // Nothing ELSE on the CV carries artwork. The avatar is a separate element
      // with a `src`, so a background image can only be a channel mark.
      const withArt = [...doc.querySelectorAll('*')].filter((el) =>
        (el.getAttribute('style') ?? '').includes('background:url('),
      );
      expect(withArt).toHaveLength(marks.length);
    });
  }

  it('registers every shipped template, ATS-safe first', () => {
    const ids = listTemplates().map((x) => x.manifest.id);
    for (const id of ['classic', 'compact', 'modern', 'timeline', 'minimal', 'banner']) {
      expect(ids).toContain(id);
    }
    // The folder name IS the id (the registry derives one from the other).
    for (const { manifest } of listTemplates()) {
      expect(manifest.id).toBe(manifest.id.trim());
    }
    expect(listTemplates()[0].manifest.atsSafe).toBe(true);
  });

  /**
   * `data-page-bleed` is RETIRED. Core used to turn it into a `fixed` View, but
   * @react-pdf v4 stopped repeating fixed nodes nested inside the parsed-markup
   * wrapper, so a template relying on it would lose its accent column on every
   * page but the first — silently. The mechanism is `manifest.pageBleed` now,
   * and this makes the dead attribute impossible to reintroduce.
   */
  for (const { manifest, load } of listTemplates()) {
    it(`draws no page bleed inside the markup of "${manifest.id}"`, async () => {
      const Template = (await load()).default;
      const html = renderToStaticMarkup(createElement(Template, { resume, t, formatDate }));
      expect(html).not.toContain('data-page-bleed');
    });
  }
});
