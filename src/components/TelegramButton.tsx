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
 * Icon-only below `xl`: the label pushes the header into a second line, on a
 * narrow phone (logo + language switch + this) and again just above `lg`, where
 * the four working controls come back but 200px of width does not. The
 * invitation still reaches everyone — it is the tooltip on a pointer device and
 * the accessible name everywhere.
 *
 * The threshold was `lg` until 2026-09-02, when measuring the header across
 * 20 locales × 14 widths showed it wrapping at **1024px in thirteen of them**,
 * and a wrapped header spills out of its own fixed height. See `useResponsive`.
 */
export function TelegramButton(): JSX.Element {
  const { t } = useTranslation();
  const { isWide } = useResponsive();
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
        {isWide ? t('header.telegram') : null}
      </Button>
    </Tooltip>
  );
}
