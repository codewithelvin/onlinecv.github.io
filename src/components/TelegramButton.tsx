import type { JSX } from 'react';
import { Button, Tooltip } from 'antd';
import { FaTelegram } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../hooks/useResponsive';

/** The project's community group. */
export const TELEGRAM_URL = 'https://t.me/onlinecvaz';

/** Telegram's brand blue. Used on the glyph only, so no text sits on it. */
const TELEGRAM_BLUE = '#229ED9';

/**
 * "Join our Telegram community" — top-right of every header, next to the
 * language switcher, on phones as well as on desktop.
 *
 * Icon-only below `lg`: the mobile header already carries the logo and a
 * three-way language switch, and the label pushes that row into a second line
 * on a narrow phone. The invitation still reaches everyone — it is the tooltip
 * on a pointer device and the accessible name everywhere.
 */
export function TelegramButton(): JSX.Element {
  const { t } = useTranslation();
  const { isDesktop } = useResponsive();
  const label = t('header.telegramJoin');

  return (
    <Tooltip title={label}>
      <Button
        id="telegram-community"
        href={TELEGRAM_URL}
        target="_blank"
        // `noopener` is the security half; `noreferrer` covers older engines
        // that only honour it as a pair.
        rel="noopener noreferrer"
        aria-label={label}
        icon={<FaTelegram color={TELEGRAM_BLUE} aria-hidden />}
      >
        {isDesktop ? t('header.telegram') : null}
      </Button>
    </Tooltip>
  );
}
