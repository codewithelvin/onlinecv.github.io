import { createContext, useContext } from 'react';

/**
 * Namespace for the DOM ids of the controls inside it, e.g. `basics` →
 * `basics-firstName`.
 *
 * React's `useId` produces ids like `:r7:` — unique, but they change with the
 * render order, so a test-automation selector written against one is broken by
 * the next unrelated edit. A scope plus the field's own `name` gives QA a
 * stable, readable handle on every control (`#experience-position`) without a
 * hand-maintained id at each call site. Scopes nest, and the context reaches
 * modals because React context flows through portals.
 *
 * The provider is the `FieldScope` component in `fields.tsx`; the context and
 * the hook live here so that file exports components only (react-refresh).
 */
export const FieldScopeContext = createContext<string>('');

/**
 * The DOM id for `name` in the current scope, or `undefined` when there is no
 * name to build one from. Also used for the buttons that belong to a scope
 * (`add`, `save`, the per-row controls), not just for fields.
 */
export function useScopedId(name: string | undefined): string | undefined {
  const scope = useContext(FieldScopeContext);
  if (!name) return undefined;
  // RHF paths can be dotted/indexed; ids stay simple and selector-friendly.
  const safe = name.replace(/[.[\]]+/g, '-').replace(/-+$/, '');
  return scope ? `${scope}-${safe}` : safe;
}
