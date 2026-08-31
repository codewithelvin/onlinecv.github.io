import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './i18n/locales';
import {
  SITE_ORIGIN,
  hreflangAlternates,
  initialLocale,
  localeFromPath,
  localeSegment,
  localeUrl,
  pathForLocale,
} from './seo-locales';

/**
 * The locale ↔ URL contract. Driven off `SUPPORTED_LOCALES` throughout, so adding
 * a language extends these automatically rather than leaving it silently
 * unreachable to search — which is the whole defect this replaced.
 */
describe('locale URLs', () => {
  /**
   * NO TRAILING SLASH. `/az` is served as a real 200 from the emitted `az.html`
   * (Pages resolves extensionless requests against `<name>.html` first), where a
   * bare `az/` directory would answer `301 → /az/` — the redirect a webmaster
   * tool reports as "non-indexable". Pinned because the slash is exactly the
   * kind of thing a later edit restores by reflex.
   */
  it.each(SUPPORTED_LOCALES)('gives %s its own absolute URL, slash-less', (locale) => {
    expect(localeUrl(locale)).toBe(`${SITE_ORIGIN}/${locale}`);
    expect(localeSegment(locale)).toBe(locale);
    expect(localeUrl(locale).endsWith('/')).toBe(false);
  });

  it('gives every locale a distinct URL', () => {
    const urls = SUPPORTED_LOCALES.map(localeUrl);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe('localeFromPath', () => {
  it.each(SUPPORTED_LOCALES)('reads %s out of the path', (locale) => {
    expect(localeFromPath(`/${locale}`)).toBe(locale);
    // The compatibility directory form still resolves — it is still served, and
    // is what any already-indexed or externally-linked URL uses.
    expect(localeFromPath(`/${locale}/`)).toBe(locale);
    // And the bare file, which nothing links but anyone can type.
    expect(localeFromPath(`/${locale}.html`)).toBe(locale);
    // Must also work under a project sub-path. The app is served from the domain
    // root now, but these functions scan segments rather than assume a position,
    // and that is exactly what keeps the two deployments interchangeable.
    expect(localeFromPath(`/onlinecv.github.io/${locale}`)).toBe(locale);
  });

  it('returns nothing when the path names no language', () => {
    expect(localeFromPath('/')).toBeUndefined();
    expect(localeFromPath('/onlinecv.github.io/')).toBeUndefined();
    expect(localeFromPath('/something/else/')).toBeUndefined();
    expect(localeFromPath('/something.html')).toBeUndefined();
  });
});

describe('pathForLocale', () => {
  it('replaces an existing locale segment in place, keeping the base path', () => {
    expect(pathForLocale('/onlinecv.github.io/az', 'ru')).toBe('/onlinecv.github.io/ru');
    expect(pathForLocale('/az', 'ar')).toBe('/ar');
  });

  it('appends one when the path has none', () => {
    expect(pathForLocale('/', 'en')).toBe('/en');
    expect(pathForLocale('/onlinecv.github.io/', 'en')).toBe('/onlinecv.github.io/en');
  });

  /**
   * The address bar after a switch must hold the CANONICAL form, so arriving on
   * either legacy shape has to normalize rather than compound: `/az/` must not
   * become `/ru/`, and `/az.html` must not become `/az.html/ru`.
   */
  it('normalizes the legacy directory and bare-file forms onto the slash-less one', () => {
    expect(pathForLocale('/az/', 'ru')).toBe('/ru');
    expect(pathForLocale('/az.html', 'ru')).toBe('/ru');
    expect(pathForLocale('/az.html', 'az')).toBe('/az');
  });

  it('is idempotent', () => {
    expect(pathForLocale(pathForLocale('/', 'ka'), 'ka')).toBe('/ka');
  });
});

describe('initialLocale', () => {
  /**
   * The precedence that matters: a locale in the URL is an explicit request (a
   * search result, a shared link), the stored value is only a past preference.
   */
  it('lets the URL win over the stored preference', () => {
    expect(initialLocale('/ru', 'en')).toBe('ru');
    expect(initialLocale('/ru/', 'en')).toBe('ru');
  });

  it('keeps the stored preference when the URL names no language', () => {
    expect(initialLocale('/', 'en')).toBe('en');
  });

  it('falls back to the default for a first visit to the bare domain', () => {
    expect(initialLocale('/', undefined)).toBe(DEFAULT_LOCALE);
  });
});

describe('hreflangAlternates', () => {
  it('lists every locale plus x-default', () => {
    const alternates = hreflangAlternates();
    expect(alternates).toHaveLength(SUPPORTED_LOCALES.length + 1);
    for (const locale of SUPPORTED_LOCALES) {
      expect(alternates.some((a) => a.hreflang === locale && a.href === localeUrl(locale))).toBe(
        true,
      );
    }
  });

  /**
   * `x-default` points at the default LOCALE page, not at `/`. Pointing it at the
   * root would leave `/` and `/az` as two URLs claiming the same content, which
   * is the duplicate-content problem hreflang exists to avoid.
   */
  it('points x-default at the default locale page', () => {
    const xDefault = hreflangAlternates().find((a) => a.hreflang === 'x-default');
    expect(xDefault?.href).toBe(localeUrl(DEFAULT_LOCALE));
  });
});
