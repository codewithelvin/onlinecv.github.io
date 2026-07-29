/**
 * Analytics boundary (spec §20/§22, BR-3). The ONLY permitted network calls.
 * Both integrations are no-ops unless their `VITE_*` id is set at build time,
 * and both fail silently offline (§19.1). No consent banner (per build plan A5).
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let initialized = false;

function injectScript(src: string, async = true): void {
  const el = document.createElement('script');
  el.async = async;
  el.src = src;
  document.head.appendChild(el);
}

function initGoogleAnalytics(measurementId: string): void {
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${measurementId}`);
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId);
}

function initClarity(projectId: string): void {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.text = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${projectId}");`;
  document.head.appendChild(script);
}

/** Initialize analytics once, if ids are configured. Safe to call in any environment. */
export function initAnalytics(): void {
  if (initialized || typeof document === 'undefined') return;
  initialized = true;

  const ga = import.meta.env.VITE_GA_MEASUREMENT_ID;
  const clarity = import.meta.env.VITE_CLARITY_PROJECT_ID;

  try {
    if (ga) initGoogleAnalytics(ga);
    if (clarity) initClarity(clarity);
  } catch {
    // Analytics must never break the app (§17).
  }
}
