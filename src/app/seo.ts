import type { WebSite, WithContext } from 'schema-dts';
import type { Locale } from '../types/resume';
import { i18n } from './i18n';

/**
 * Landing-page SEO (spec §19.2): update the localized <title>/description on
 * language change, and inject JSON-LD `WebSite` + `Organization` once. The
 * `Person`/candidate schema is intentionally NOT used (no public profiles).
 */

const JSONLD_ID = 'seo-jsonld';

function setMetaByName(name: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Open Graph tags only, i.e. `<meta property=…>`.
 *
 * The Twitter pair is `<meta name=…>` in `index.html` (which is what X's own
 * documentation writes), so it must go through `setMetaByName` — routing it
 * here found nothing and silently did nothing, leaving the card copy in the
 * default language after a language switch.
 */
function setMetaByProperty(property: string, content: string): void {
  const el = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (el) el.setAttribute('content', content);
}

function websiteJsonLd(): WithContext<WebSite> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'OnlineCV',
    description: i18n.t('seo.description'),
    url: 'https://onlinecv.az/',
    publisher: {
      '@type': 'Organization',
      name: 'OnlineCV',
      url: 'https://onlinecv.az/',
      logo: 'https://onlinecv.az/pwa/maskable.png',
      image: 'https://onlinecv.az/pwa/logo512.png',
    },
  };
}

/** Apply localized head metadata and ensure the JSON-LD block exists. */
export function updateSeo(locale: Locale): void {
  if (typeof document === 'undefined') return;

  const title = i18n.t('seo.title');
  const description = i18n.t('seo.description');
  document.title = title;
  setMetaByName('description', description);
  setMetaByProperty('og:title', title);
  setMetaByProperty('og:description', description);
  setMetaByName('twitter:title', title);
  setMetaByName('twitter:description', description);
  document.documentElement.setAttribute('lang', locale);

  let script = document.getElementById(JSONLD_ID);
  if (!script) {
    script = document.createElement('script');
    script.id = JSONLD_ID;
    script.setAttribute('type', 'application/ld+json');
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(websiteJsonLd());
}
