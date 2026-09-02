import type { Locale } from '../../types/resume';
import type { HelpShotId } from './types';

/**
 * Where a guide screenshot lives, and how big it is.
 *
 * ONE SET PER LANGUAGE (spec §10.4, user's decision): `help-shots/az/editor.webp`.
 * A reader who is confused by the interface must not be handed a picture of a
 * different interface, which is what a single English set would do for nineteen of
 * the twenty languages.
 *
 * ⚠️ `help-shots/`, not `help/`, and the awkward name is load bearing: the guide
 * PAGES are emitted at `/az/help`, and GitHub Pages resolves an extensionless
 * request against `<name>.html` before `<name>/index.html`. A folder called `help/`
 * next to a file called `help.html` resolves fine today, but the two would be one
 * typo away from fighting over the same address. Different names, no argument.
 *
 * WEBP, and that is doing two jobs. It is roughly half the bytes of the equivalent
 * JPEG across ~180 images, and the extension is absent from `globPatterns` in
 * `vite.config.ts`, so the whole set stays out of the PWA precache *automatically*
 * rather than through an exclusion someone has to remember to add. A `CacheFirst`
 * `runtimeCaching` rule keeps them once seen, so the guide is fully illustrated
 * offline from the second visit onwards.
 */

/**
 * The capture size of each shot, in CSS pixels.
 *
 * Emitted as `width`/`height` on the image so the page reserves the right box
 * before the file arrives — without them the article reflows as each screenshot
 * loads, which on a guide is the reader losing their place mid-sentence.
 *
 * Duplicated from `scripts/make-help-shots.ts` in the sense that the script clips
 * to exactly these numbers — it imports THIS table, so there is one copy and the
 * files cannot disagree with the markup describing them.
 */
export const HELP_SHOT_SIZE: Record<HelpShotId, { width: number; height: number }> = {
  wizard: { width: 800, height: 700 },
  editor: { width: 1180, height: 760 },
  list: { width: 640, height: 560 },
  // 620 is the dialog's own desktop width (`useModalChrome(620)`), so 700 leaves
  // a strip of mask on each side — which is what makes it read as a layer over
  // the page rather than as a page. 880 holds the whole capped dialog; see
  // `viewportHeight` in the capture script for why it has to be capped at all.
  modal: { width: 700, height: 880 },
  visibility: { width: 640, height: 440 },
  photo: { width: 600, height: 640 },
  templates: { width: 920, height: 660 },
  actions: { width: 780, height: 96 },
  mobile: { width: 400, height: 780 },
};

/**
 * The URL of one screenshot.
 *
 * `base` is passed in rather than read from `import.meta.env`, for the same reason
 * `seo-locales.ts` takes it: the static page generator runs in Node, where that
 * object does not exist.
 */
export function helpShotUrl(base: string, locale: Locale, id: HelpShotId): string {
  return `${base}help-shots/${locale}/${id}.webp`;
}
