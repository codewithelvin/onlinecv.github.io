import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Width at which the wordmark takes over, in px — Ant Design's `md`, i.e. the
 * narrow edge of a portrait tablet. Below it is phone territory.
 *
 * MUST match the `@media` query behind `.brand-logo` in `index.css`, which
 * switches the height at the same point. Both halves of the swap have to happen
 * together or a 42px-tall wordmark lands in a 64px header.
 */
const WORDMARK_FROM = 768;

/**
 * App mark in the header, in two shapes.
 *
 * The two files are not the same artwork: `logo.svg` is the SQUARE mark
 * (152×152) and `logo.png` is the wide WORDMARK (426×71). Phones get the mark —
 * at the widths where the header also carries the Telegram button and a
 * three-way language switch, the wordmark would crowd them out — and tablets
 * and desktops get the wordmark.
 *
 * Sizes differ with the shape, not just the screen: the square mark reads small
 * for its box, so it runs at 42px against the wordmark's 30px. Both heights
 * live in `index.css` next to the media query, since the source swap is a media
 * query too.
 *
 * Done with `<picture>` rather than a breakpoint hook on purpose: the swap is
 * then the browser's own media-query match, so it happens on rotation and
 * resize with no React render and no flash of the wrong logo on first paint.
 *
 * No text label either way — both files carry the name, which reaches screen
 * readers through `alt`.
 */
export function Brand(): JSX.Element {
  const { t } = useTranslation();
  const base = import.meta.env.BASE_URL;
  return (
    <picture style={{ display: 'flex' }}>
      <source media={`(min-width: ${WORDMARK_FROM}px)`} srcSet={`${base}logo.png`} />
      <img className="brand-logo" src={`${base}logo.svg`} alt={t('common.appName')} />
    </picture>
  );
}
