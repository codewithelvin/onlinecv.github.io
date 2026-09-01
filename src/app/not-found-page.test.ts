import { describe, expect, it } from 'vitest';
import { renderNotFoundPage, type NotFoundStrings } from './not-found-page';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, LOCALES } from './i18n/locales';
import type { Locale } from '../types/resume';
import az from './i18n/az.json';

/**
 * `404.html` is the one page on the site that answers an address nobody chose, so
 * the things worth asserting are the ones that would fail silently: a language
 * missing from the embedded table (that locale's visitors get Azerbaijani), a URL
 * that lost its base prefix (broken logo, broken way back), or the app bundle
 * creeping in (a dead link becomes the editor again, which is the exact soft-404
 * this page exists to stop).
 */

/** Distinguishable per-locale copy, so a test can tell which one was embedded. */
function copyFixture(): Record<Locale, NotFoundStrings> {
  return Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [
      locale,
      {
        title: `title-${locale}`,
        body: `body-${locale}`,
        retired: `retired-${locale}`,
        action: `action-${locale}`,
      },
    ]),
  ) as Record<Locale, NotFoundStrings>;
}

const page = (base = '/'): string => renderNotFoundPage(copyFixture(), base);

describe('404 page', () => {
  it('ships the default locale in the static markup', () => {
    const html = page();
    // The no-JavaScript and crawler case: complete content before the inline
    // script runs, not an empty shell waiting to be filled in.
    expect(html).toContain(`<html lang="${DEFAULT_LOCALE}"`);
    expect(html).toContain(`title-${DEFAULT_LOCALE}`);
    expect(html).toContain(`body-${DEFAULT_LOCALE}`);
    expect(html).toContain(`retired-${DEFAULT_LOCALE}`);
    expect(html).toContain(`action-${DEFAULT_LOCALE}`);
  });

  it('embeds every supported locale with its writing direction', () => {
    const html = page();
    for (const locale of SUPPORTED_LOCALES) {
      // One file serves every miss on the site, so a locale absent here cannot be
      // switched to at all — it silently falls back to Azerbaijani.
      expect(html, `no copy embedded for "${locale}"`).toContain(`title-${locale}`);
      expect(html, `no direction embedded for "${locale}"`).toContain(
        `"action-${locale}","dir":"${LOCALES[locale].dir}"`,
      );
    }
  });

  it('never loads the app', () => {
    const html = page();
    /**
     * The whole design decision in one assertion. Making `404.html` a copy of
     * `index.html` is the usual static-host trick, and it is wrong for a
     * single-route app: there is no route to recover, so booting the app hands
     * someone who asked for a retired university page the CV editor with no
     * indication their link was dead.
     */
    expect(html).not.toContain('type="module"');
    expect(html).not.toContain('/assets/');
    expect(html).not.toContain('main.tsx');
    expect(html).not.toContain('id="root"');
  });

  it('keeps itself out of the index', () => {
    expect(page()).toContain('name="robots" content="noindex');
  });

  it('base-qualifies every URL it carries', () => {
    const html = page('/onlinecv.github.io/');
    // Same failure mode as the service worker's `navigateFallback`: a URL that
    // forgets the base resolves against the domain root and 404s inside the 404.
    expect(html).toContain('href="/onlinecv.github.io/favicon.ico"');
    expect(html).toContain('src="/onlinecv.github.io/logo.svg"');
    expect(html).toContain('/onlinecv.github.io/fonts/woff2/Inter-Regular.woff2');
    expect(html).toContain(`href="/onlinecv.github.io/${DEFAULT_LOCALE}"`);
    expect(html).toContain('var BASE = "/onlinecv.github.io/"');
    // Nothing left pointing at the old root-relative shape.
    expect(html).not.toContain('href="/logo.svg"');
  });

  it('links back to the slash-less canonical locale URL', () => {
    const html = page();
    // `/az`, not `/az/` — the redirecting form the canonical exists to retire.
    expect(html).toContain(`href="/${DEFAULT_LOCALE}"`);
    expect(html).not.toContain(`href="/${DEFAULT_LOCALE}/"`);
  });

  it('escapes copy instead of interpolating it raw', () => {
    const hostile = copyFixture();
    hostile[DEFAULT_LOCALE] = {
      title: '<script>alert(1)</script>',
      body: 'Tom & Jerry',
      retired: '"quoted"',
      action: '<b>go</b>',
    };
    const html = renderNotFoundPage(hostile, '/');

    // Translations are hand-written, so this is not a live threat — but the page
    // is assembled by string concatenation, and that is the class of bug that
    // makes such a page a delivery vehicle rather than an error message.
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Tom &amp; Jerry');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('cannot close its own script tag from the embedded copy', () => {
    const hostile = copyFixture();
    hostile[DEFAULT_LOCALE] = {
      ...hostile[DEFAULT_LOCALE],
      body: '</script><img src=x onerror=alert(1)>',
    };
    const html = renderNotFoundPage(hostile, '/');
    const inline = html.slice(html.lastIndexOf('<script>'));

    // `<` is escaped to `\u003c` throughout the JSON blob, so no string in it can
    // end the script early — the one way an embedded translation table becomes XSS.
    expect(inline).not.toContain('</script><img');
    expect(inline).toContain('\\u003c/script>');
  });

  it('writes the failed address as text, never as markup', () => {
    // The path comes straight from the URL bar. A source-grep, because the DOM
    // cases above cannot execute the inline script: this is the one line where
    // `innerHTML` would turn a crafted link into script execution on our origin.
    const html = page();
    expect(html).toContain("text('nf-path', path)");
    // An assignment, not the bare word — the script's own comment names
    // `innerHTML` to say why it is not used.
    expect(html).not.toMatch(/innerHTML\s*=/);
    expect(html).not.toMatch(/insertAdjacentHTML|document\.write/);
  });

  it('asks for no East Asian font', () => {
    const html = page();
    /**
     * Deliberate: the CJK faces are 4.1–16.1 MB and are the only assets kept out
     * of the precache for that reason. Downloading one for an error page would
     * cost several times the whole app; those scripts fall through to the system
     * font here.
     */
    expect(html).not.toContain('NanumGothic');
    expect(html).not.toContain('NotoSansSC');
    expect(html).not.toContain('NotoSansJP');
    expect(html).toContain('Inter-Regular.woff2');
  });

  it('uses the AA-passing brand tone for text, not the brand blue', () => {
    const html = page();
    // #1877F2 is ~4.2:1 on white and fails AA at this size; it stays on
    // `theme-color`, which paints no text.
    expect(html).toContain('name="theme-color" content="#1877F2"');
    expect(html).toContain('#1461c7');
    expect(html).not.toContain('background: #1877F2');
  });
});

describe('404 copy in the shipped bundles', () => {
  /**
   * `locales.test.ts` already guarantees all 20 bundles have the same key paths as
   * `az`, so this only has to pin the shape `renderNotFoundPage` depends on — one
   * assertion, on the bundle the other 19 are checked against.
   */
  it('gives az every key the page renders', () => {
    expect(Object.keys(az.notFound).sort()).toEqual(['action', 'body', 'retired', 'title']);
  });
});
