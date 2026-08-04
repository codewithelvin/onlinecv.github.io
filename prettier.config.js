/**
 * Prettier configuration.
 *
 * The settings are chosen to MATCH the code that is already here rather than to
 * impose a new house style — the point of adding a formatter to a finished
 * codebase is to stop arguing about whitespace, not to rewrite 17k lines. Two
 * options are therefore non-default, and both were measured before being picked.
 *
 * A `.js` config rather than `.prettierrc.json` so these reasons can live next to
 * the values, the same way `vite.config.ts` and `eslint.config.js` do. ESLint does
 * not lint it (its config only matches `**\/*.{ts,tsx}`).
 *
 * `prettier` is pinned to an EXACT version in `package.json`, unlike the other
 * dev dependencies: a formatter's output legitimately changes between minor
 * releases, and with a caret range a fresh `npm install` could reformat files
 * nobody touched and make `format:check` fail on someone else's machine.
 *
 * ESLint needs no `eslint-config-prettier` alongside this: the flat config runs
 * `js.configs.recommended` + `typescript-eslint`'s recommended set and adds three
 * rules of its own, none of which is stylistic, so there is nothing for the two
 * tools to disagree about. Keeping it that way is also §27 (the dependency list
 * stays closed) — check before adding a plugin that a conflict actually exists.
 *
 * @type {import('prettier').Config}
 */
export default {
  /**
   * 100, not the default 80. MEASURED across the repo's 155 source files /
   * 16,854 lines: 1,539 lines are longer than 80 characters and only 99 are
   * longer than 100 (19 longer than 110). So 80 would rewrap roughly one line in
   * eleven — a diff that touches nearly every file and buries the real history —
   * while 100 is the width the code was already written to.
   */
  printWidth: 100,
  /** Single quotes, which is what every `.ts`/`.tsx` file here already uses. */
  singleQuote: true,
  /**
   * LF, matching the git index: `git ls-files --eol` reports `i/lf` for all 195
   * tracked text files. The working tree is mixed, because `core.autocrlf=true`
   * checks some of them out as CRLF — which is exactly why `.gitattributes` now
   * pins `eol=lf`. Without that, a fresh clone on Windows would fail
   * `format:check` on line endings alone, on files nobody had edited.
   */
  endOfLine: 'lf',
  overrides: [
    {
      /**
       * CSS keeps DOUBLE quotes. `singleQuote` applies to CSS strings too, and
       * every `@font-face` in `index.css` is written `font-family: "Inter"` —
       * flipping them would rewrite the one file whose contents cannot be
       * asserted by a test (`css: false` under vitest) for no gain.
       */
      files: '*.css',
      options: { singleQuote: false },
    },
  ],
};
