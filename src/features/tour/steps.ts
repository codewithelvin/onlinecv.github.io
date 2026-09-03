import type { Step } from 'react-joyride';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../../hooks/useResponsive';
import { HELP_TEMPLATE_COUNT } from '../help/counts';

/**
 * The editor tour's script (FR-20 / §10.5).
 *
 * ⚠️ WHY THIS FEATURE EXISTS, so it is never trimmed into decoration: a user
 * spent an hour filling in a CV, never found the Templates button, could not get
 * the design with a photo, and abandoned the app. Everything the editor can do is
 * reachable from a button in a bar the user apparently never read. So the tour
 * leads with **templates** — before the sections, before the export — and its copy
 * names the photo explicitly, because that was the thing being looked for.
 *
 * The order is deliberate and was asked for: the buttons first, then each section
 * briefly. Buttons are what a filled-in CV needs and what nobody finds; sections
 * are what the screen already invites you to do.
 *
 * ONE `import type` from react-joyride and nothing else — the type is erased, so
 * this module can be imported (and tested) without pulling the tour engine into
 * the entry chunk. See `TourMount` for the split.
 */

/**
 * The accordion sections, in the order `EditorPanel` lists them.
 *
 * Duplicated from that component rather than derived from it, because the panel
 * builds its list inline out of nine JSX blocks and exporting an ordered registry
 * would be a refactor of it for one consumer. The duplicate is not left to
 * discipline: `tour.test.tsx` mounts the real editor and asserts that every
 * `.ant-collapse-item` on screen carries a class this list produces, so adding a
 * tenth section turns the tour red naming it.
 */
export const TOUR_SECTIONS = [
  'basics',
  'contact',
  'experience',
  'education',
  'certifications',
  'skills',
  'languages',
  'projects',
  'interests',
] as const;

export type TourSection = (typeof TOUR_SECTIONS)[number];

/**
 * The class that makes an editor section addressable by the tour.
 *
 * A CLASS rather than an id, because `Collapse` forwards `className` to the panel
 * wrapper and does not forward an id. Read from both sides through this one
 * function so the selector and the markup cannot drift apart.
 */
export function tourSectionClass(section: string): string {
  return `tour-section-${section}`;
}

/** What the tour says about one thing on screen, before Joyride's defaults. */
interface StepSpec {
  /** Stable name for the step — used by tests, never shown. */
  id: string;
  target: string;
  title: string;
  content: string;
  placement: Step['placement'];
  /**
   * The target lives in a sticky bar, so it is on screen at every scroll
   * position.
   *
   * Both flags this sets are needed and they solve different halves of the same
   * problem. `skipScroll` stops Joyride scrolling the page to an element that is
   * already visible — for a stuck element the arithmetic is circular (scrolling
   * moves the page, which moves the element) and the result is a jittering
   * spotlight. `isFixed` then makes the floater position itself against the
   * viewport rect instead of a document coordinate that a sticky element does not
   * have.
   */
  sticky?: boolean;
}

/**
 * The tour, resolved for the current language and layout.
 *
 * Responsive, and not cosmetically so: below `lg` the editor moves four of its
 * controls out of the header into the bottom action bar, puts the preview behind
 * a tab and the backup download at the foot of the Edit tab. A step whose target
 * is not in the DOM is a dead step (Joyride waits a second, then gives up), so the
 * targets are chosen per layout rather than hoped for.
 */
export function useTourSteps(): Step[] {
  const { t } = useTranslation();
  const { isDesktop } = useResponsive();

  /** Where the header sits relative to its buttons on each layout. */
  const barPlacement = isDesktop ? 'bottom' : 'top';

  const specs: StepSpec[] = [
    {
      id: 'templates',
      // The mobile action bar's copy of the button has an id of its own so the
      // two placements stay separately addressable — see `TemplatePicker`.
      target: isDesktop ? '#template-picker' : '#template-picker-compact',
      title: t('header.templates'),
      content: t('tour.steps.templates', { templates: HELP_TEMPLATE_COUNT }),
      placement: barPlacement,
      sticky: true,
    },
    {
      /**
       * Second, straight after the design, because the preview is where a
       * template change becomes visible — that is the pair the abandoned session
       * never connected.
       *
       * On desktop the target is the sticky preview COLUMN rather than the sheet
       * inside it: the column is pinned 80px below the top on every scroll
       * position, so it needs no scrolling, while the sheet inside it sits in a
       * scroll container of its own and Joyride would scroll that instead of the
       * page. Below `lg` there is no column at all — the preview is a tab, so the
       * tab button is both the honest target and the thing worth pointing at.
       */
      id: 'preview',
      target: isDesktop ? '.preview-column' : '#editorTabs-tab-preview',
      title: t('header.preview'),
      content: t('tour.steps.preview'),
      placement: isDesktop ? 'auto' : 'bottom',
      sticky: isDesktop,
    },
    // Only on desktop: the CV-language select lives inside the preview pane,
    // which below `lg` is behind the other tab and therefore not in the DOM.
    // Skipped rather than faked — the guide's `export` topic covers it in full.
    ...(isDesktop
      ? [
          {
            id: 'cvLanguage',
            target: '#cv-language-picker',
            title: t('header.cvLanguage'),
            content: t('tour.steps.cvLanguage'),
            placement: 'bottom' as const,
            sticky: true,
          },
        ]
      : []),
    {
      id: 'uiLanguage',
      target: '#ui-language',
      title: t('header.language'),
      content: t('tour.steps.uiLanguage'),
      placement: 'bottom',
      sticky: true,
    },
    {
      id: 'export',
      target: '#export-pdf',
      title: t('export.downloadPdf'),
      content: t('tour.steps.export'),
      placement: barPlacement,
      sticky: true,
    },
    {
      /**
       * Not sticky below `lg`: the backup download is the one control that is NOT
       * in the mobile action bar — a fourth button there wraps the bar to two rows
       * on every phone width — so on a phone it sits in normal flow at the foot of
       * the Edit tab and has to be scrolled to.
       */
      id: 'backup',
      target: '#backup-download',
      title: t('backup.download'),
      content: t('tour.steps.backup'),
      placement: barPlacement,
      sticky: isDesktop,
    },
    {
      id: 'reset',
      target: '#reset-cv',
      title: t('common.reset'),
      content: t('tour.steps.reset'),
      placement: barPlacement,
      sticky: true,
    },
    {
      // Last of the buttons rather than first, even though it is the header's
      // left-most control: the guide is the answer to "I still have a question",
      // which only makes sense once the reader has seen what there is to ask about.
      id: 'help',
      target: '#help-open',
      title: t('help.open'),
      content: t('tour.steps.help'),
      placement: 'bottom',
      sticky: true,
    },
    ...TOUR_SECTIONS.map((section) => ({
      id: `section-${section}`,
      /**
       * The section's HEADER ROW, not the whole panel. Three of the nine start
       * expanded, so highlighting the panel would spotlight a box the height of a
       * form for some sections and a 48px strip for others. The header is the same
       * shape whatever the section's state, which is what makes nine steps in a
       * row read as a list rather than as the page jumping about.
       */
      target: `.${tourSectionClass(section)} > .ant-collapse-header`,
      // The heading the user is looking at, reused rather than re-translated:
      // a tour that renames the thing it points at is a tour that has to be kept
      // in step with the UI by hand.
      title: t(`sections.${section}`),
      content: t(`tour.sections.${section}`),
      placement: 'bottom' as const,
    })),
  ];

  return specs.map(({ id, target, title, content, placement, sticky }) => ({
    // Joyride's own `id`, so a failure it reports names the step rather than a
    // CSS selector.
    id,
    target,
    title,
    content,
    placement,
    isFixed: sticky === true,
    skipScroll: sticky === true,
  }));
}
