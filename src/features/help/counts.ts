import { SUPPORTED_LOCALES } from '../../app/i18n/locales';

/**
 * The two numbers the guide is allowed to state about the app (spec §10.4: "any
 * number it states is read from the app's own registries, never typed into
 * prose"), and how they reach twenty translated files without being typed into
 * any of them.
 *
 * Content carries the tokens `{{templates}}` and `{{languages}}`; both renderers
 * substitute them at render time. So a translator never writes a number, and a
 * sentence like "6 designs" cannot survive a seventh template being added in any
 * one of the twenty languages — which is precisely the kind of stale detail that
 * makes a reader stop trusting a manual.
 */

/**
 * How many templates ship. A CONSTANT rather than `listTemplates().length`, and
 * that is forced rather than lazy.
 *
 * `templates/_core/registry.ts` discovers folders with `import.meta.glob`, which
 * only exists inside a Vite transform. One of the two renderers of this content is
 * `vite-plugin-locale-pages.ts`, which runs in the Node process that LOADS the Vite
 * config — there the glob is never expanded, so the registry cannot be called and
 * importing it would not merely be slow, it would be empty.
 *
 * A hand-maintained number rots, so it is not left to discipline:
 * `help-content.test.ts` asserts this equals `listTemplates().length`. Adding a
 * template folder therefore turns a test red naming the number to change, which is
 * the same bargain the font stacks take where a duplicate is unavoidable.
 */
export const HELP_TEMPLATE_COUNT = 6;

/** How many languages the app ships in — this one really can be read. */
export const HELP_LANGUAGE_COUNT = SUPPORTED_LOCALES.length;

/**
 * Substitute `{{templates}}` / `{{languages}}` in a guide string.
 *
 * Deliberately NOT i18next interpolation, even though the app has i18next: the
 * guide is loaded outside the i18n resource tree (`content/index.ts` explains why),
 * and the static page generator has no i18next instance at all. A two-token
 * replace is the whole requirement, and it behaves identically in both renderers.
 *
 * An unknown token is left alone rather than replaced with an empty string — a
 * visible `{{foo}}` in one language is a bug report; a silently missing word is
 * not.
 */
export function fillCounts(text: string): string {
  return text
    .replace(/\{\{templates\}\}/g, String(HELP_TEMPLATE_COUNT))
    .replace(/\{\{languages\}\}/g, String(HELP_LANGUAGE_COUNT));
}
