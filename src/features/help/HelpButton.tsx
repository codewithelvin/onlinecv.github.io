import type { JSX } from 'react';
import { Button, Tooltip } from 'antd';
import { FiHelpCircle } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../../hooks/useResponsive';
import { useHelpStore } from './help-store';
import { SECTION_HELP_TOPIC } from './topics';

/**
 * The way into the guide from the top bar (spec §10.4).
 *
 * Icon-only below `xl`, like `TelegramButton` beside it and for the same measured
 * reason: the header carries the logo, the community button, the language switch
 * and — from `lg` up — four working controls, and one more label wraps that row
 * onto a second line. The invitation still reaches everyone: it is the tooltip on
 * a pointer device and the accessible name everywhere, and the guide has two
 * other entrances (the wizard's link and a `?` on every editor section).
 *
 * ⚠️ Adding this button is what pushed the row over — at `lg` the header went
 * from six controls to seven, and at 1024px **thirteen of the twenty locales
 * wrapped**. See `useResponsive` for the measurement and for why a wrap is not
 * survivable in a fixed-height `Layout.Header`.
 */
export function HelpButton(): JSX.Element {
  const { t } = useTranslation();
  const { isWide } = useResponsive();
  const openHelp = useHelpStore((s) => s.openHelp);
  const label = t('help.open');

  return (
    <Tooltip title={label}>
      <Button
        id="help-open"
        aria-label={label}
        icon={<FiHelpCircle aria-hidden />}
        onClick={() => openHelp()}
      >
        {isWide ? t('help.short') : null}
      </Button>
    </Tooltip>
  );
}

/**
 * The `?` on an editor section's heading — the direct answer to the problem this
 * feature exists for ("people are not familiar with some inputs"). It opens the
 * guide on the article that explains THIS section, rather than at the top of a
 * manual the reader then has to search.
 *
 * ⚠️ `stopPropagation` is not optional here. The button sits inside an AntD
 * `Collapse` header, and every click in that header toggles the panel — so without
 * it, asking for help on a section would collapse the section you asked about,
 * which is the exact opposite of the intent.
 */
export function SectionHelpButton({ section }: { section: string }): JSX.Element | null {
  const { t } = useTranslation();
  const openHelp = useHelpStore((s) => s.openHelp);
  const topic = SECTION_HELP_TOPIC[section];
  if (!topic) return null;

  const label = t('help.section');
  return (
    <Tooltip title={label}>
      <Button
        id={`help-section-${section}`}
        type="text"
        size="small"
        aria-label={label}
        icon={<FiHelpCircle aria-hidden />}
        onClick={(event) => {
          event.stopPropagation();
          openHelp(topic);
        }}
      />
    </Tooltip>
  );
}
