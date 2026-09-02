/** One run of guide text, and whether it is emphasised. */
export interface HelpRun {
  text: string;
  bold: boolean;
}

/**
 * Split guide text on `**bold**`.
 *
 * The whole inline vocabulary of the guide, deliberately: one marker, no nesting,
 * no links, no code spans. Everything else is a block (`./types`). The reason is
 * that this string comes from twenty translation files, and every marker added
 * here is a new way for one of them to be subtly wrong in a language nobody on the
 * project reads — a stray `*` should degrade to a visible asterisk, never to a
 * swallowed sentence.
 *
 * Shared by BOTH renderers (the in-app panel and the static page generator), so
 * emphasis cannot mean one thing on screen and another in the served HTML. This
 * module returns RUNS rather than markup precisely so it can: the panel turns them
 * into React nodes, the page turns them into escaped HTML, and neither has to know
 * about the other's escaping rules.
 *
 * An unmatched `**` is left as literal text rather than treated as an opener with
 * no closer — the split below only pairs complete markers, so the worst a broken
 * translation can do is print two asterisks.
 */
export function parseInline(text: string): HelpRun[] {
  const runs: HelpRun[] = [];
  // Non-greedy, and `[\s\S]` rather than `.` so a run may span a newline.
  const pattern = /\*\*([\s\S]+?)\*\*/g;
  let at = 0;

  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match.index > at) runs.push({ text: text.slice(at, match.index), bold: false });
    runs.push({ text: match[1], bold: true });
    at = match.index + match[0].length;
  }
  if (at < text.length) runs.push({ text: text.slice(at), bold: false });

  // A block whose text is empty still has to render as something, so callers can
  // map over the result unconditionally.
  return runs.length > 0 ? runs : [{ text, bold: false }];
}

/** The text without its markers — for a `title`, an `alt`, or a plain-text context. */
export function stripInline(text: string): string {
  return parseInline(text)
    .map((run) => run.text)
    .join('');
}
