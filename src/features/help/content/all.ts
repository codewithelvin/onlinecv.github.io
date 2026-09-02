import type { Locale } from '../../../types/resume';
import type { HelpContent } from '../types';

import az from './az.json';
import ar from './ar.json';
import de from './de.json';
import el from './el.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import he from './he.json';
import hu from './hu.json';
import it from './it.json';
import ja from './ja.json';
import ka from './ka.json';
import kk from './kk.json';
import ko from './ko.json';
import pl from './pl.json';
import pt from './pt.json';
import ru from './ru.json';
import tr from './tr.json';
import uz from './uz.json';
import zh from './zh.json';

/**
 * Every language's guide, EAGERLY — for the build only.
 *
 * ⚠️ NOTHING IN `src/` MAY IMPORT THIS FILE. It is the exact opposite of what
 * `./index.ts` is for: importing it from a component would pull all twenty
 * languages of a five-thousand-word manual into the entry chunk and silently undo
 * the code-splitting that module exists to provide. `help-content.test.ts`
 * source-greps for it, which is the only way to catch that — the app would still
 * work perfectly, just several hundred kilobytes heavier on every first visit,
 * and no other gate can see the difference.
 *
 * It exists because `vite-plugin-locale-pages.ts` renders the guide to static HTML
 * inside a Rollup `generateBundle` hook, which is synchronous with respect to
 * module loading: it cannot `await import()`. The same reason it imports the
 * twenty i18n bundles statically a few lines from where it imports this.
 *
 * The cast is the one `content/index.ts` explains: a JSON import is typed
 * structurally, so a discriminated union widens to `{ kind: string }` however
 * correct the file is. `help-content.test.ts` validates all twenty against the real
 * union.
 */
export const HELP_CONTENT = {
  az,
  ar,
  de,
  el,
  en,
  es,
  fr,
  he,
  hu,
  it,
  ja,
  ka,
  kk,
  ko,
  pl,
  pt,
  ru,
  tr,
  uz,
  zh,
} as unknown as Record<Locale, HelpContent>;
