import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyLocale, DEFAULT_LOCALE, i18n } from './i18n';
import { updateSeo } from './seo';

/**
 * `updateSeo` re-labels the head when the language changes, and every one of its
 * writes is a `querySelector` that does NOTHING when it misses. That is the
 * whole reason this file exists: the Twitter pair is `<meta name=…>` in
 * `index.html`, was being looked up as `<meta property=…>`, and so kept the
 * default language for the life of the page without a single error anywhere.
 *
 * So the fixture below is deliberately the SHAPE of `index.html` — `property`
 * for Open Graph, `name` for Twitter — not a shape convenient for the code.
 */
const HEAD = `
  <meta name="description" content="seed" />
  <meta property="og:title" content="seed" />
  <meta property="og:description" content="seed" />
  <meta name="twitter:title" content="seed" />
  <meta name="twitter:description" content="seed" />
`;

const contentOf = (selector: string): string | null =>
  document.head.querySelector<HTMLMetaElement>(selector)?.getAttribute('content') ?? null;

describe('updateSeo', () => {
  beforeEach(() => {
    document.head.innerHTML = HEAD;
  });

  afterEach(() => {
    document.head.innerHTML = '';
    applyLocale(DEFAULT_LOCALE);
  });

  it('localizes the title and all four social copy tags', () => {
    applyLocale('en');
    updateSeo('en');

    const title = i18n.t('seo.title');
    const description = i18n.t('seo.description');

    expect(document.title).toBe(title);
    expect(contentOf('meta[name="description"]')).toBe(description);
    expect(contentOf('meta[property="og:title"]')).toBe(title);
    expect(contentOf('meta[property="og:description"]')).toBe(description);
    // The two that were silently skipped: matched by `name`, as the HTML writes them.
    expect(contentOf('meta[name="twitter:title"]')).toBe(title);
    expect(contentOf('meta[name="twitter:description"]')).toBe(description);
  });

  it('leaves no tag holding another language after a switch', () => {
    applyLocale('en');
    updateSeo('en');
    applyLocale('ja');
    updateSeo('ja');

    const english = i18n.getFixedT('en')('seo.description');
    for (const selector of [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
    ]) {
      expect(contentOf(selector)).toBe(i18n.t('seo.description'));
      expect(contentOf(selector)).not.toBe(english);
    }
    expect(document.documentElement.getAttribute('lang')).toBe('ja');
  });

  it('does not invent a duplicate tag when one is already present', () => {
    applyLocale('en');
    updateSeo('en');

    expect(document.head.querySelectorAll('meta[name="twitter:description"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
  });
});
