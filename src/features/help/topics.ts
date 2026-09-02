/**
 * The guide's table of contents (spec §10.4).
 *
 * The ORDER here is the order the reader sees, and it deliberately follows the
 * order someone actually meets the app — what it is, the first screen, the editor,
 * then each section top to bottom, then everything you do once the CV is written.
 * It is not alphabetical and not grouped by feature area; a guide is opened by
 * someone in the middle of a task, not browsed.
 *
 * The ids are a CONTRACT in three places at once: they key the content files, they
 * are the topic anchors on the static pages (`/az/help#skills`), and they are what
 * an editor section's `?` passes to open the right article. Renaming one silently
 * breaks an external link, so treat them like the DOM ids in `FieldScope`.
 *
 * ⚠️ DELIBERATELY FREE OF REACT AND OF ICONS. This module is imported by
 * `vite-plugin-locale-pages.ts`, which runs in the Node process that loads the Vite
 * config — a single `react-icons` import here would bundle React into that process
 * for nothing. The icons live in `./icons`, which only the panel loads.
 */

export const HELP_TOPICS = [
  'start',
  'wizard',
  'editor',
  'basics',
  'contact',
  'experience',
  'education',
  'certifications',
  'skills',
  'languages',
  'projects',
  'templates',
  'export',
  'backup',
  'install',
  'privacy',
  'writing',
  'faq',
] as const;

export type HelpTopicId = (typeof HELP_TOPICS)[number];

/** Whether a string names a topic — used to validate a `#hash` or a stored id. */
export function isHelpTopic(value: string): value is HelpTopicId {
  return (HELP_TOPICS as readonly string[]).includes(value);
}

/**
 * Which topic an editor section's `?` opens.
 *
 * Keyed by the section keys in `EditorPanel`. Two sections share one topic on
 * purpose: **interests** is three sentences long and lives inside the projects
 * article rather than being padded into an article of its own — a topic list is a
 * navigation aid, and an entry that resolves to a paragraph teaches the reader
 * that entries are not worth opening.
 */
export const SECTION_HELP_TOPIC: Record<string, HelpTopicId> = {
  basics: 'basics',
  contact: 'contact',
  experience: 'experience',
  education: 'education',
  certifications: 'certifications',
  skills: 'skills',
  languages: 'languages',
  projects: 'projects',
  interests: 'projects',
};

/** The topic the guide opens on when nothing more specific was asked for. */
export const DEFAULT_HELP_TOPIC: HelpTopicId = 'start';
