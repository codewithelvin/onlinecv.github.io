import { describe, expect, it } from 'vitest';
import { i18n } from '../../app/i18n';
import { DEFAULT_LOCALE, LOCALES, SUPPORTED_LOCALES } from '../../app/i18n/locales';
import { renderHelpPage, type HelpPageStrings } from '../../app/help-page';
import { helpUrl } from '../../app/seo-locales';
import { listTemplates } from '../../templates/_core/registry';
import type { Locale } from '../../types/resume';
import { HELP_CONTENT } from './content/all';
import { HELP_LANGUAGE_COUNT, HELP_TEMPLATE_COUNT, fillCounts } from './counts';
import { parseInline, stripInline } from './inline';
import { HELP_SHOT_SIZE } from './shots';
import { DEFAULT_HELP_TOPIC, HELP_TOPICS, SECTION_HELP_TOPIC, isHelpTopic } from './topics';
import { HELP_BLOCK_KINDS, HELP_SHOTS, type HelpBlock, type HelpContent } from './types';

/**
 * The guide is twenty JSON files of prose, and TypeScript can see none of it: a
 * JSON import widens `HelpBlock` to `{ kind: string; … }` however correct the file
 * is (`content/index.ts` explains why the cast is unavoidable). So the union is
 * enforced here instead, at build time, against data that ships with the app.
 *
 * The failures worth catching are the silent ones. A missing topic renders a
 * navigation button that opens nothing. A translator who drops one bullet from a
 * four-item list leaves a reader in that language short of a step, and the screen
 * looks perfectly normal. A `{{templates}}` token lost in translation prints a
 * stale number. A new language committed as a copy of `en.json` is a guide that
 * "exists" in twenty languages and reads in one — which is exactly the state this
 * feature was in before these assertions existed.
 */

const NON_DEFAULT = SUPPORTED_LOCALES.filter((l) => l !== 'en');

/** Only two tokens exist; anything else is a typo that would print literally. */
const KNOWN_TOKENS = ['{{templates}}', '{{languages}}'];

/**
 * Every translatable string in a guide, keyed by a path that names the block and
 * the item — so a failure says `skills.4.2.def`, not "some string somewhere".
 */
function strings(content: HelpContent): Map<string, string> {
  const out = new Map<string, string>();
  out.set('title', content.title);
  out.set('intro', content.intro);
  for (const [id, topic] of Object.entries(content.topics)) {
    out.set(`${id}.title`, topic.title);
    out.set(`${id}.lead`, topic.lead);
    topic.blocks.forEach((block, i) => {
      switch (block.kind) {
        case 'p':
        case 'h':
        case 'note':
        case 'warn':
          out.set(`${id}.${i}.text`, block.text);
          break;
        case 'ul':
        case 'steps':
          block.items.forEach((item, j) => out.set(`${id}.${i}.${j}`, item));
          break;
        case 'dl':
          block.items.forEach((item, j) => {
            out.set(`${id}.${i}.${j}.term`, item.term);
            out.set(`${id}.${i}.${j}.def`, item.def);
          });
          break;
        case 'shot':
          out.set(`${id}.${i}.caption`, block.caption);
          break;
      }
    });
  }
  return out;
}

/**
 * A guide's SHAPE, as a comparable string — the block kinds in order, each shot's
 * id, and the length of every list.
 *
 * This is what makes "translated" checkable rather than merely plausible. The
 * blocks are authored once and only the strings differ per language, so two
 * languages whose shapes disagree mean one of them lost (or gained) content.
 */
function shape(content: HelpContent): string[] {
  return Object.entries(content.topics).flatMap(([id, topic]) =>
    topic.blocks.map((block) => {
      const size = 'items' in block ? `[${block.items.length}]` : '';
      const shot = block.kind === 'shot' ? `#${block.id}` : '';
      return `${id}:${block.kind}${shot}${size}`;
    }),
  );
}

/** The shape of one block, as the union really allows it. */
function assertBlock(block: HelpBlock, where: string): void {
  expect(HELP_BLOCK_KINDS, `${where}: unknown block kind "${block.kind}"`).toContain(block.kind);
  switch (block.kind) {
    case 'p':
    case 'h':
    case 'note':
    case 'warn':
      expect(typeof block.text, `${where}: text must be a string`).toBe('string');
      expect(Object.keys(block).sort(), `${where}: unexpected fields`).toEqual(['kind', 'text']);
      break;
    case 'ul':
    case 'steps':
      expect(Array.isArray(block.items), `${where}: items must be an array`).toBe(true);
      expect(block.items.length, `${where}: an empty list renders as nothing`).toBeGreaterThan(0);
      block.items.forEach((item, j) =>
        expect(typeof item, `${where}.${j}: item must be a string`).toBe('string'),
      );
      expect(Object.keys(block).sort(), `${where}: unexpected fields`).toEqual(['items', 'kind']);
      break;
    case 'dl':
      expect(block.items.length, `${where}: an empty list renders as nothing`).toBeGreaterThan(0);
      block.items.forEach((item, j) => {
        expect(typeof item.term, `${where}.${j}: term must be a string`).toBe('string');
        expect(typeof item.def, `${where}.${j}: def must be a string`).toBe('string');
        expect(Object.keys(item).sort(), `${where}.${j}: unexpected fields`).toEqual([
          'def',
          'term',
        ]);
      });
      expect(Object.keys(block).sort(), `${where}: unexpected fields`).toEqual(['items', 'kind']);
      break;
    case 'shot':
      expect(HELP_SHOTS, `${where}: no such screenshot "${block.id}"`).toContain(block.id);
      expect(typeof block.caption, `${where}: caption must be a string`).toBe('string');
      expect(Object.keys(block).sort(), `${where}: unexpected fields`).toEqual([
        'caption',
        'id',
        'kind',
      ]);
      break;
  }
}

describe('help content', () => {
  it('ships a guide for every language the app supports', () => {
    expect(Object.keys(HELP_CONTENT).sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });

  it.each(SUPPORTED_LOCALES)('%s is a valid HelpContent', (locale) => {
    const content = HELP_CONTENT[locale];
    expect(typeof content.title).toBe('string');
    expect(typeof content.intro).toBe('string');
    for (const [id, topic] of Object.entries(content.topics)) {
      expect(typeof topic.title, `${locale}/${id}: title`).toBe('string');
      expect(typeof topic.lead, `${locale}/${id}: lead`).toBe('string');
      expect(Array.isArray(topic.blocks), `${locale}/${id}: blocks`).toBe(true);
      expect(topic.blocks.length, `${locale}/${id}: no blocks`).toBeGreaterThan(0);
      topic.blocks.forEach((block, i) => assertBlock(block, `${locale}/${id}.${i}`));
    }
  });

  /**
   * Totality in both directions. A MISSING topic is a navigation button that
   * opens nothing (the panel falls back to the raw id) and an anchor that 404s
   * inside the static page; an EXTRA one is prose nobody can reach, because both
   * renderers iterate `HELP_TOPICS` rather than the file's own keys.
   */
  it.each(SUPPORTED_LOCALES)('%s covers exactly the table of contents', (locale) => {
    expect(Object.keys(HELP_CONTENT[locale])).toEqual(['title', 'intro', 'topics']);
    expect(Object.keys(HELP_CONTENT[locale].topics)).toEqual([...HELP_TOPICS]);
  });

  it.each(SUPPORTED_LOCALES)('%s has no empty string', (locale) => {
    for (const [path, value] of strings(HELP_CONTENT[locale])) {
      expect(value.trim(), `${locale}/${path} is empty`).not.toBe('');
    }
  });

  it.each(NON_DEFAULT)('%s has the same block structure as English', (locale) => {
    // Compared element by element rather than as a whole array: the diff on a
    // 200-entry mismatch is unreadable, and the first divergence is the bug.
    const expected = shape(HELP_CONTENT.en);
    const actual = shape(HELP_CONTENT[locale]);
    expect(actual.length, `${locale} has ${actual.length} blocks, en has ${expected.length}`).toBe(
      expected.length,
    );
    actual.forEach((entry, i) => {
      expect(entry, `${locale} block ${i} does not match en`).toBe(expected[i]);
    });
  });

  it.each(SUPPORTED_LOCALES)('%s has the same strings as English, key for key', (locale) => {
    expect([...strings(HELP_CONTENT[locale]).keys()]).toEqual([...strings(HELP_CONTENT.en).keys()]);
  });

  /**
   * The guard against a placeholder. Every non-English file started life as a copy
   * of `en.json` and seven of them stayed that way for a while — all twenty
   * validated, all twenty rendered, and the guide read in English for a Japanese
   * reader.
   *
   * Six words is the threshold because short strings legitimately coincide across
   * languages (a product name, `A1 — Beginner`), while a six-word English sentence
   * appearing verbatim in another language's guide is a copied placeholder. If a
   * translation ever needs to keep a long English sentence deliberately, reword it
   * or split the exemption out here by name — do not raise the threshold.
   */
  it.each(NON_DEFAULT)('%s is actually translated', (locale) => {
    const english = strings(HELP_CONTENT.en);
    const untranslated = [...strings(HELP_CONTENT[locale])]
      .filter(([path, value]) => value === english.get(path))
      .filter(([, value]) => value.split(/\s+/).length > 6)
      .map(([path]) => path);
    expect(untranslated, `${locale} still carries English copy`).toEqual([]);
  });

  it.each(SUPPORTED_LOCALES)('%s closes every ** it opens', (locale) => {
    for (const [path, value] of strings(HELP_CONTENT[locale])) {
      const markers = value.match(/\*\*/g)?.length ?? 0;
      expect(markers % 2, `${locale}/${path} has an unmatched **: ${value}`).toBe(0);
    }
  });

  /**
   * A count token is the one place a translator can silently make the guide lie:
   * drop `{{templates}}` and the sentence still reads, just without the number.
   * Mistype it and `{{tempaltes}}` is printed literally — visible, which is the
   * cheaper failure and why `fillCounts` leaves unknown tokens alone.
   */
  it.each(SUPPORTED_LOCALES)('%s keeps every count token', (locale) => {
    const english = strings(HELP_CONTENT.en);
    for (const [path, value] of strings(HELP_CONTENT[locale])) {
      for (const token of KNOWN_TOKENS) {
        const wanted = english.get(path)?.includes(token) ?? false;
        expect(value.includes(token), `${locale}/${path} ${wanted ? 'lost' : 'gained'} ${token}`) //
          .toBe(wanted);
      }
      for (const found of value.match(/\{\{[^}]*\}\}/g) ?? []) {
        expect(KNOWN_TOKENS, `${locale}/${path} uses unknown token ${found}`).toContain(found);
      }
    }
  });

  /**
   * Every screenshot the capture script produces is used, and every one used can
   * be produced. An unused id costs twenty images nobody sees; an unknown id is a
   * broken picture in twenty languages.
   */
  /**
   * Every control the guide tells the reader to press must be called what the app
   * calls it, **in that reader's own language**.
   *
   * This is the defect that is invisible from inside one language: a translator
   * renders the English sentence faithfully and invents a name for the button
   * while doing it, and the reader then hunts a screen for a control that is not
   * there. It was real in fourteen of the twenty guides at once — English told
   * people to press "Save a backup file" (the button says "Backup") and "tick
   * I study here now" (the checkbox says "I am currently studying"); twelve
   * languages sent them to a footer link called *Privacy and **analytics*** when
   * every one of those footers says *statistics*; three named the wizard's finish
   * button something the wizard does not.
   *
   * Only labels the guide quotes as bare names are listed. `wizard.next` and the
   * section headings are deliberately absent: the guide refers to those as
   * *things* rather than as *buttons*, and demanding a verbatim substring of a
   * noun a language may inflect would be a test about grammar, not about truth.
   * If a new language genuinely cannot place a label uninflected, the honest fix
   * is to rewrite the sentence around it — not to drop the key.
   */
  it.each(SUPPORTED_LOCALES)('%s names the controls the app really has', (locale) => {
    const ui = i18n.getResourceBundle(locale, 'translation') as Record<
      string,
      Record<string, string>
    >;
    const quoted: [string, string][] = [
      ['common.add', ui.common.add],
      ['common.save', ui.common.save],
      ['common.reset', ui.common.reset],
      ['common.present', ui.common.present],
      ['common.noExpiry', ui.common.noExpiry],
      ['header.edit', ui.header.edit],
      ['header.preview', ui.header.preview],
      ['header.templates', ui.header.templates],
      ['order.auto', ui.order.auto],
      ['order.manual', ui.order.manual],
      ['wizard.finish', ui.wizard.finish],
      ['export.downloadPdf', ui.export.downloadPdf],
      ['backup.download', ui.backup.download],
      ['backup.restoreButton', ui.backup.restoreButton],
      ['templatePicker.atsSafe', ui.templatePicker.atsSafe],
      ['consent.review', ui.consent.review],
      ['fields.employmentType', ui.fields.employmentType],
      ['fields.currentExperience', ui.fields.currentExperience],
      ['fields.currentEducation', ui.fields.currentEducation],
    ];
    // The whole file as text: a label may be quoted in a paragraph, a list item,
    // a definition term or a caption, and which one is not the point.
    const text = JSON.stringify(HELP_CONTENT[locale]);
    for (const [key, label] of quoted) {
      expect(text, `${locale}: the guide never says "${label}" (${key})`).toContain(label);
    }
  });

  it('uses every screenshot it declares, and declares every one it uses', () => {
    const used = new Set(
      Object.values(HELP_CONTENT.en.topics)
        .flatMap((topic) => topic.blocks)
        .filter((block) => block.kind === 'shot')
        .map((block) => block.id),
    );
    expect([...used].sort()).toEqual([...HELP_SHOTS].sort());
    expect(Object.keys(HELP_SHOT_SIZE).sort()).toEqual([...HELP_SHOTS].sort());
  });
});

describe('help topics', () => {
  it('has no duplicate id, and a real default', () => {
    expect(new Set(HELP_TOPICS).size).toBe(HELP_TOPICS.length);
    expect(isHelpTopic(DEFAULT_HELP_TOPIC)).toBe(true);
  });

  it('recognises its own ids and nothing else', () => {
    for (const id of HELP_TOPICS) expect(isHelpTopic(id)).toBe(true);
    expect(isHelpTopic('nope')).toBe(false);
    expect(isHelpTopic('')).toBe(false);
  });

  /**
   * `SectionHelpButton` renders NOTHING when a section is not in the map, so an
   * editor section added later would quietly lose its `?` — no error, no warning,
   * just a missing button. The source is the only place that fact lives.
   */
  it('maps every editor section that asks for a `?`', async () => {
    const sources = import.meta.glob('/src/features/editor/EditorPanel.tsx', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const panel = Object.values(sources)[0];
    expect(panel, 'EditorPanel.tsx not found').toBeTruthy();

    const sections = [...panel.matchAll(/section="([a-zA-Z]+)"/g)].map((m) => m[1]);
    // The regex has to have matched, or this asserts nothing at all.
    expect(sections.length).toBeGreaterThan(5);
    for (const section of new Set(sections)) {
      expect(SECTION_HELP_TOPIC[section], `no guide topic for section "${section}"`).toBeTruthy();
    }
    for (const [section, topic] of Object.entries(SECTION_HELP_TOPIC)) {
      expect(isHelpTopic(topic), `section "${section}" points at a non-topic`).toBe(true);
      expect(sections, `section "${section}" is mapped but has no \`?\``).toContain(section);
    }
  });
});

describe('help counts', () => {
  /**
   * The one duplicated number in the feature, duplicated because
   * `templates/_core/registry` needs `import.meta.glob` and the static page
   * generator runs where that does not exist (`counts.ts` explains it). So adding
   * a template folder turns THIS red, naming the number to change.
   */
  it('states the real number of templates', () => {
    expect(HELP_TEMPLATE_COUNT).toBe(listTemplates().length);
  });

  it('states the real number of languages', () => {
    expect(HELP_LANGUAGE_COUNT).toBe(SUPPORTED_LOCALES.length);
  });

  it('substitutes both tokens, anywhere in the string, as often as they appear', () => {
    expect(fillCounts('{{templates}} designs in {{languages}} languages')).toBe(
      `${HELP_TEMPLATE_COUNT} designs in ${HELP_LANGUAGE_COUNT} languages`,
    );
    expect(fillCounts('{{templates}}/{{templates}}')).toBe(
      `${HELP_TEMPLATE_COUNT}/${HELP_TEMPLATE_COUNT}`,
    );
  });

  it('leaves an unknown token visible rather than swallowing it', () => {
    // A visible `{{foo}}` is a bug report; a silently missing word is not.
    expect(fillCounts('{{foo}} and {{templates}}')).toBe(`{{foo}} and ${HELP_TEMPLATE_COUNT}`);
  });
});

describe('help inline markup', () => {
  it('splits on **bold** and keeps the surrounding text', () => {
    expect(parseInline('press **Save** now')).toEqual([
      { text: 'press ', bold: false },
      { text: 'Save', bold: true },
      { text: ' now', bold: false },
    ]);
  });

  it('handles several runs, and one that spans a newline', () => {
    expect(parseInline('**a** b **c**').filter((r) => r.bold)).toEqual([
      { text: 'a', bold: true },
      { text: 'c', bold: true },
    ]);
    expect(parseInline('**one\ntwo**')).toEqual([{ text: 'one\ntwo', bold: true }]);
  });

  it('leaves an unmatched marker as literal text', () => {
    // The worst a broken translation can do is print two asterisks.
    expect(parseInline('a ** b')).toEqual([{ text: 'a ** b', bold: false }]);
  });

  it('always returns at least one run, so callers can map unconditionally', () => {
    expect(parseInline('')).toEqual([{ text: '', bold: false }]);
  });

  it('strips markers for plain-text contexts', () => {
    expect(stripInline('press **Save** now')).toBe('press Save now');
  });
});

/** Distinguishable chrome, so a test can tell which string was placed where. */
const pageStrings: HelpPageStrings = {
  topics: 'CHROME-TOPICS',
  action: 'CHROME-ACTION',
};

const page = (locale: Locale, base = '/'): string =>
  renderHelpPage(locale, HELP_CONTENT[locale], pageStrings, base);

describe('help page', () => {
  it.each(SUPPORTED_LOCALES)('%s renders every topic as an addressable article', (locale) => {
    const html = page(locale);
    for (const id of HELP_TOPICS) {
      // The `#skills` anchor is what the panel's "Open as a page" button and any
      // shared link rely on.
      expect(html, `${locale}: no article for "${id}"`).toContain(`<article id="${id}">`);
      expect(html, `${locale}: no table-of-contents entry for "${id}"`).toContain(`href="#${id}"`);
    }
  });

  it.each(SUPPORTED_LOCALES)('%s declares its own language and direction', (locale) => {
    expect(page(locale)).toContain(`<html lang="${locale}" dir="${LOCALES[locale].dir}">`);
  });

  it.each(SUPPORTED_LOCALES)('%s canonicalizes to its own guide URL', (locale) => {
    const html = page(locale);
    expect(html).toContain(`<link rel="canonical" href="${helpUrl(locale)}" />`);
    // The alternates must point at the other GUIDES, not at the landing pages —
    // an `hreflang` set that sends a French reader of the English guide to the
    // French home page has answered a question nobody asked.
    for (const other of SUPPORTED_LOCALES) {
      expect(html, `${locale}: no alternate for "${other}"`).toContain(
        `hreflang="${other}" href="${helpUrl(other)}"`,
      );
    }
    expect(html).toContain(`hreflang="x-default" href="${helpUrl(DEFAULT_LOCALE)}"`);
  });

  it.each(SUPPORTED_LOCALES)('%s links a reader to all nineteen other guides', (locale) => {
    const html = page(locale);
    for (const other of SUPPORTED_LOCALES) {
      expect(html, `${locale}: no reader-visible link to "${other}"`).toContain(
        LOCALES[other].nativeName,
      );
    }
  });

  it('substitutes count tokens and leaves no braces in the output', () => {
    const html = page('en');
    expect(html).toContain(`${HELP_TEMPLATE_COUNT} designs`);
    expect(html).not.toContain('{{');
  });

  it('resolves every asset against the base path', () => {
    const html = page('az', '/onlinecv.github.io/');
    expect(html).toContain('src="/onlinecv.github.io/logo.svg"');
    expect(html).toContain('href="/onlinecv.github.io/favicon.ico"');
    expect(html).toContain('/onlinecv.github.io/fonts/woff2/Inter-Regular.woff2');
    expect(html).toContain('src="/onlinecv.github.io/help-shots/az/editor.webp"');
    expect(html).toContain('href="/onlinecv.github.io/az/help"');
  });

  /**
   * Same decision as `404.html`, and the same reason: a page whose entire job is
   * to be readable must not wait on a 1.8 MB bundle. It is also what keeps the
   * guide indexable as prose instead of as an empty `<div id="root">`.
   */
  it('ships no application JavaScript', () => {
    const html = page('en');
    expect(html).not.toContain('<div id="root">');
    expect(html).not.toContain('type="module"');
    // The only `<script>` allowed is the JSON-LD block, which does not execute.
    const scripts = [...html.matchAll(/<script([^>]*)>/g)].map((m) => m[1]);
    expect(scripts).toEqual([' type="application/ld+json"']);
  });

  it('declares itself as a TechArticle in its own language', () => {
    const data = JSON.parse(
      /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(page('ja'))?.[1] ?? '{}',
    ) as Record<string, unknown>;
    expect(data['@type']).toBe('TechArticle');
    expect(data.inLanguage).toBe('ja');
    expect(data.url).toBe(helpUrl('ja'));
    expect(data.headline).toBe(HELP_CONTENT.ja.title);
  });

  it('reserves each screenshot’s box so the article cannot reflow under the reader', () => {
    const html = page('en');
    for (const [id, size] of Object.entries(HELP_SHOT_SIZE)) {
      expect(html, `no sized <img> for "${id}"`).toContain(
        `alt="${stripInline(shotCaption(id))}" width="${size.width}" height="${size.height}"`,
      );
    }
  });

  /**
   * `/az/help#projects` reported as broken, and it was — standards-compliantly.
   * The browser scrolls the article to y=0, the sticky bar is painted over the
   * top 81px of it, and the reader arrives mid-paragraph with the heading they
   * asked for hidden underneath and nothing to click to recover.
   *
   * jsdom does no layout, so the landing itself cannot be asserted here (it was
   * verified over CDP: 360 landings, 20 locales × 6 widths × 3 topics). What CAN
   * be pinned is that the two rules which make it right are still in the emitted
   * CSS — unlike `index.css`, this stylesheet is a string in a module, so it is
   * reachable from a test.
   */
  it('offsets anchor targets from the sticky bar', () => {
    const html = page('en');
    expect(html).toContain('article[id] { scroll-margin-top: 96px; }');
    // Below 576px the bar stops sticking, because German, Greek and Hungarian
    // wrap it to a second row there and no single offset could then be right.
    expect(html).toContain('.bar { position: static; }');
    expect(html).toContain('article[id] { scroll-margin-top: 16px; }');
  });

  it('escapes markup that appears in the copy', () => {
    const hostile: HelpContent = {
      title: 'Guide',
      intro: 'intro',
      topics: Object.fromEntries(
        HELP_TOPICS.map((id) => [
          id,
          {
            title: '</script><img onerror=alert(1)>',
            lead: 'a "quoted" & <bold> lead',
            blocks: [{ kind: 'p' as const, text: '**<b>bold</b>** & plain' }],
          },
        ]),
      ),
    };
    const html = renderHelpPage('en', hostile, pageStrings, '/');
    expect(html).not.toContain('<img onerror');
    expect(html).toContain('&lt;/script&gt;');
    // `**bold**` still becomes real emphasis — its CONTENT is what gets escaped.
    expect(html).toContain('<strong>&lt;b&gt;bold&lt;/b&gt;</strong>');
  });
});

/** The English caption for a shot id — the `alt` the page is expected to carry. */
function shotCaption(id: string): string {
  for (const topic of Object.values(HELP_CONTENT.en.topics)) {
    for (const block of topic.blocks) {
      if (block.kind === 'shot' && block.id === id) return block.caption;
    }
  }
  throw new Error(`no shot block uses "${id}"`);
}

describe('help content loading', () => {
  /**
   * The invariant no other gate can see. `content/all.ts` imports all twenty
   * languages EAGERLY, for the build's static pages; importing it from app code
   * would drag a five-thousand-word manual in twenty languages into the entry
   * chunk and silently undo `content/index.ts`. The app would still work — just
   * several hundred kilobytes heavier on every first visit, for text most
   * visitors never open.
   *
   * Read through Vite's own `?raw` glob rather than `node:fs`, because
   * `@types/node` is deliberately not a dependency (§27) — the same mechanism
   * `consent.test.ts` uses, and comment lines are stripped first for the same
   * reason: `all.ts` and `index.ts` both name the file in prose precisely to warn
   * about this.
   */
  it('is never imported eagerly by the app', () => {
    const sources = import.meta.glob('/src/**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;

    const offenders = Object.entries(sources)
      .filter(([path]) => !/\.test\.tsx?$/.test(path))
      .filter(([path]) => path !== '/src/features/help/content/all.ts')
      .filter(([, code]) =>
        code
          .split('\n')
          .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line))
          .join('\n')
          .match(/from '\.{1,2}(\/[\w-]+)*\/all'|content\/all'/),
      )
      .map(([path]) => path);

    // The glob has to have found the app, or this asserts nothing at all.
    expect(Object.keys(sources).length).toBeGreaterThan(50);
    expect(offenders, 'the guide must be code-split — import ./content, not ./content/all').toEqual(
      [],
    );
  });

  it('has a lazy loader for every language', async () => {
    const { loadHelpContent, getCachedHelpContent } = await import('./content');
    expect(getCachedHelpContent('az')).toBeUndefined();
    const loaded = await loadHelpContent('az');
    expect(Object.keys(loaded.topics)).toEqual([...HELP_TOPICS]);
    // Cached after the first open, so reopening the panel paints immediately
    // instead of flashing a spinner over content the browser already has.
    expect(getCachedHelpContent('az')).toBe(loaded);
  });
});
