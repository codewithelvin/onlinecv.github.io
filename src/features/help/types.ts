/**
 * The shape of the user guide (spec §10.4, FR-19).
 *
 * GUIDE COPY IS STRUCTURED DATA, NOT MARKUP, and that is the decision the rest of
 * this feature hangs off. A guide is prose, and the obvious way to ship prose is
 * an HTML string per language — which is exactly what this avoids, for three
 * reasons that all cost something real:
 *
 *  1. It would put twenty files of free-form markup into the translation set. One
 *     unclosed tag, or one stray `<`, and a language ships broken layout that no
 *     gate can see; and rendering it at all would mean `innerHTML`, which this
 *     codebase deliberately does not have anywhere (see `not-found-page.ts`).
 *  2. The same content has to render TWICE — as Ant Design nodes in the in-app
 *     panel, and as standalone HTML on the static `/az/help` page. A block union
 *     lets both renderers switch exhaustively, so adding a block kind is a
 *     compile error in both rather than a silent no-op in one.
 *  3. A translator edits sentences, never structure. The blocks are the same in
 *     all twenty languages; only the strings differ.
 *
 * The ONE inline affordance is `**bold**`, parsed by `./inline`. Anything richer
 * is a block.
 */

/** Every screenshot the guide can embed. See `scripts/make-help-shots.ts`. */
export const HELP_SHOTS = [
  /** The first-run wizard, step 1, including the restore-from-file block. */
  'wizard',
  /** The desktop editor: sections on the left, live preview on the right. */
  'editor',
  /** One expanded list section — entries, the order switch, the add button. */
  'list',
  /** An item editor modal (work experience), filled in. */
  'modal',
  /** The personal-details block with its show/hide toggles. */
  'visibility',
  /** The avatar cropper. */
  'photo',
  /** The template gallery. */
  'templates',
  /** The header action row: templates, reset, backup, download. */
  'actions',
  /** The phone layout: Edit/Preview tabs and the bottom action bar. */
  'mobile',
] as const;

export type HelpShotId = (typeof HELP_SHOTS)[number];

/**
 * Every block kind, as a closed union.
 *
 * `kind` rather than `type`, because `type` is already the name of a field in half
 * the resume model and this list is read next to it often enough for that to
 * matter.
 */
export type HelpBlock =
  /** A paragraph. Supports `**bold**`. */
  | { kind: 'p'; text: string }
  /** A sub-heading inside a topic. */
  | { kind: 'h'; text: string }
  /** An unordered list. Each item supports `**bold**`. */
  | { kind: 'ul'; items: string[] }
  /** A numbered list, for anything the reader is meant to do in order. */
  | { kind: 'steps'; items: string[] }
  /** Term/definition pairs — the workhorse for "what does this field want?". */
  | { kind: 'dl'; items: { term: string; def: string }[] }
  /** A highlighted aside. Useful, not urgent. */
  | { kind: 'note'; text: string }
  /** A highlighted aside for something that can go wrong or cannot be undone. */
  | { kind: 'warn'; text: string }
  /** A screenshot in the reader's own language, with its caption. */
  | { kind: 'shot'; id: HelpShotId; caption: string };

/** The block kinds, for renderers and tests that must cover all of them. */
export const HELP_BLOCK_KINDS = [
  'p',
  'h',
  'ul',
  'steps',
  'dl',
  'note',
  'warn',
  'shot',
] as const satisfies readonly HelpBlock['kind'][];

/** One topic: a heading, a one-line summary, and its blocks. */
export interface HelpTopicContent {
  /** Shown in the topic list and as the article's heading. */
  title: string;
  /** One sentence under the title — also the topic list's second line. */
  lead: string;
  blocks: HelpBlock[];
}

/** A whole guide, in one language. */
export interface HelpContent {
  /** "OnlineCV guide" — the panel's and the page's title. */
  title: string;
  /** A sentence introducing the guide as a whole. */
  intro: string;
  /** Keyed by `HelpTopicId`; totality is asserted in `help-content.test.ts`. */
  topics: Record<string, HelpTopicContent>;
}
