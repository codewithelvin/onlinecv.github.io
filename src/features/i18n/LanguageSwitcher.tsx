import type { JSX } from 'react';
import { Button, Dropdown, Tooltip } from 'antd';
import { FiChevronDown, FiGlobe } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { LOCALES, SUPPORTED_LOCALES, toLocale } from '../../app/i18n';
import { useResumeStore } from '../../state/store';

/**
 * UI language switcher (spec §10.1). Persists via the store → IndexedDB. The
 * options come from the locale registry, so a new language appears here as soon
 * as it is registered.
 *
 * A dropdown rather than the row of chips this used to be: the chips grew with
 * every language (Georgian made four), and the header they share with the brand
 * and the Telegram button has no room to grow on a phone. One trigger costs the
 * same width whether the app speaks three languages or ten, and the menu has the
 * space to name each one in its own language instead of abbreviating it to two
 * letters.
 *
 * No flags. They would be a nice affordance if they worked, but Windows ships no
 * glyphs for the regional-indicator emoji (🇦🇿 renders as the letters "AZ"), and a
 * flag names a country rather than a language — Russian and English in particular
 * have no single one. The endonym is unambiguous everywhere.
 */
export function LanguageSwitcher(): JSX.Element {
  const { t } = useTranslation();
  const uiLocale = useResumeStore((s) => s.uiLocale);
  const setUiLocale = useResumeStore((s) => s.setUiLocale);
  const label = t('header.language');

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        selectable: true,
        selectedKeys: [uiLocale],
        onClick: ({ key }) => setUiLocale(toLocale(key)),
        items: SUPPORTED_LOCALES.map((code) => ({
          key: code,
          // The id goes on a node inside the label: antd's menu items take no
          // `id` of their own, and QA automation needs to address each option.
          label: <span id={`ui-language-${code}`}>{LOCALES[code].nativeName}</span>,
        })),
      }}
    >
      <Tooltip title={label}>
        <Button id="ui-language" aria-label={label} icon={<FiGlobe aria-hidden />}>
          {LOCALES[uiLocale].short}
          <FiChevronDown aria-hidden style={{ marginInlineStart: 2, verticalAlign: -1 }} />
        </Button>
      </Tooltip>
    </Dropdown>
  );
}
