import { type JSX, useState } from 'react';
import { Button } from 'antd';
import { FiGlobe } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { LOCALES } from '../../app/i18n';
import { useResumeStore } from '../../state/store';
import { LanguageModal } from './LanguageModal';

/**
 * UI language switcher (spec §10.1). Persists via the store → IndexedDB. The
 * options come from the locale registry, so a new language appears here as soon
 * as it is registered.
 *
 * One trigger, and a MODAL rather than the dropdown this used to open. A menu is
 * the right shape for a handful of one-line options and the wrong one once each
 * option wants a flag, an endonym and a code, and once the options want grouping:
 * a dropdown that tall on a phone becomes a scrolling strip pinned under the
 * header, while a dialog owns the screen it needs. The trigger costs the same
 * width whether the app speaks three languages or thirty.
 *
 * The globe carries no chevron any more — that glyph promises a menu directly
 * below, which is no longer what happens.
 *
 * No tooltip either. The trigger already SHOWS its state as text (`AZ`, `EN`, …)
 * beside a globe, so a hover card only repeats what is on screen — and on a
 * phone, where the header is tightest, it never appears at all. The name is
 * still carried by `aria-label` for anyone who cannot see the glyph.
 */
export function LanguageSwitcher(): JSX.Element {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const uiLocale = useResumeStore((s) => s.uiLocale);
  const setUiLocale = useResumeStore((s) => s.setUiLocale);
  const label = t('header.language');

  return (
    <>
      <Button
        id="ui-language"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        icon={<FiGlobe aria-hidden />}
        onClick={() => setOpen(true)}
      >
        {LOCALES[uiLocale].short}
      </Button>
      <LanguageModal
        open={open}
        current={uiLocale}
        onSelect={setUiLocale}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
