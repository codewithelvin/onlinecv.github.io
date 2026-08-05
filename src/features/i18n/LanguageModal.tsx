import type { JSX } from 'react';
import { Button, Col, Modal, Row, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Locale } from '../../types/resume';
import { LOCALES, REGION_ORDER, SUPPORTED_LOCALES } from '../../app/i18n';
import { useModalChrome } from '../../hooks/useModalChrome';
import { useScrollLock } from '../../hooks/useScrollLock';
import { Flag } from './flags';

/** Ring colour for the language already in use — the brand blue pinned in `theme.ts`. */
const SELECTED = '#1461c7';

/**
 * The language picker: a titleless, footerless modal of flag + endonym + ISO code
 * tiles, grouped by region.
 *
 * WHY IT HAS NO FOOTER, given that `useModalChrome` establishes the opposite rule
 * ("every modal must carry a footer button that closes it", because none of them
 * draw a close cross any more). That rule exists so a full-screen dialog on a
 * phone always has a visible way out — and here every tile is one: choosing a
 * language closes the dialog, and the language already in use is a tile too, drawn
 * as selected, so tapping it leaves without changing anything. A footer would add
 * a second exit next to six existing ones. Escape and the mask still work on
 * desktop.
 *
 * Groups come from `REGION_ORDER` and only render when they hold something, so the
 * seventh region costs nothing until a language lives there.
 *
 * WIDTH IS A FUNCTION OF THE LANGUAGE COUNT, and it has already been changed once.
 * At six languages a 560px two-column dialog was square-ish; at thirteen the same
 * dialog became a tall ladder — seven tile rows plus four headings — and on a
 * laptop the list ran past the fold while half the screen sat empty. It is now
 * 760px with a THIRD column from `md` up, which folds the same thirteen tiles into
 * five rows. The tiles themselves did not change size; the grid did.
 */
export function LanguageModal({
  open,
  onClose,
  onSelect,
  current,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (locale: Locale) => void;
  current: Locale;
}): JSX.Element {
  const { t } = useTranslation();
  const { fullScreen, modalProps } = useModalChrome(760);
  useScrollLock(open);

  const groups = REGION_ORDER.map((region) => ({
    region,
    locales: SUPPORTED_LOCALES.filter((code) => LOCALES[code].region === region),
  })).filter((group) => group.locales.length > 0);

  return (
    <Modal
      open={open}
      /**
       * Visually titleless, but NOT nameless. A dialog needs an accessible name,
       * and antd's own mechanism for that is the header: it points the dialog's
       * `aria-labelledby` at the title element. Passing `aria-label` instead does
       * nothing — measured: antd/rc-dialog does not forward it to the element that
       * carries `role="dialog"`. So the header is rendered and then hidden in CSS
       * (`.language-picker .ant-modal-header` in `index.css`).
       */
      title={t('header.language')}
      /**
       * No footer on desktop — see the note above; every tile is an exit, and the
       * mask and Escape close the dialog too.
       *
       * On a phone the dialog is FULL-SCREEN: there is no mask left to tap and no
       * close cross anywhere in this app, so without this button the only way out
       * would be to commit to a language. This is the `useModalChrome` rule
       * applying exactly where it was written for.
       */
      footer={
        fullScreen ? (
          // `large` is the theme's 44px `controlHeightLG`: this button is the ONLY
          // exit at this size, so it gets the §10.3 touch target rather than the
          // 35px default the rest of the controls use.
          <Button id="ui-language-close" block size="large" onClick={onClose}>
            {t('common.close')}
          </Button>
        ) : null
      }
      onCancel={onClose}
      {...modalProps}
      className={`${modalProps.className ?? ''} language-picker`.trim()}
    >
      <div id="ui-language-modal" style={{ paddingBlock: 4 }}>
        {groups.map(({ region, locales }) => (
          <section key={region} style={{ marginBottom: 18 }}>
            <Typography.Text
              type="secondary"
              strong
              style={{
                display: 'block',
                marginBottom: 8,
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              }}
            >
              {t(`regions.${region}`)}
            </Typography.Text>
            <Row gutter={[10, 10]}>
              {locales.map((code) => {
                const selected = code === current;
                /*
                 * One tile per row on a phone, two on a small tablet, three from
                 * `md` up — which is every size this dialog is NOT full-screen at,
                 * since `useModalChrome` goes full-screen below `lg`. The
                 * breakpoints are the VIEWPORT's, not the dialog's, so a
                 * full-screen 768px tablet gets three columns as well and the
                 * picker stays one screenful there too.
                 */
                return (
                  <Col key={code} xs={24} sm={12} md={8}>
                    {/*
                     * A real <button>: the tile performs an action, so it gets
                     * keyboard focus and Enter/Space for free. `aria-pressed`
                     * carries the selected state that the ring shows visually.
                     */}
                    <button
                      id={`ui-language-${code}`}
                      type="button"
                      lang={code}
                      aria-pressed={selected}
                      onClick={() => {
                        onSelect(code);
                        onClose();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        // The §10.3 touch target, and roomy enough on desktop.
                        minHeight: 44,
                        padding: '8px 12px',
                        background: '#fff',
                        cursor: 'pointer',
                        borderRadius: 8,
                        // Selection is a RING over a 1px border, never a thicker
                        // one — the same rule the template gallery follows, so the
                        // tile cannot change size when it becomes selected.
                        border: `1px solid ${selected ? SELECTED : '#d9d9d9'}`,
                        boxShadow: selected ? `0 0 0 1px ${SELECTED}` : 'none',
                        // Reading order, so the tile mirrors itself in an RTL UI
                        // without a second rule.
                        textAlign: 'start',
                      }}
                    >
                      <Flag locale={code} />
                      <span style={{ flex: 1, minWidth: 0, fontWeight: selected ? 600 : 400 }}>
                        {LOCALES[code].nativeName}
                      </span>
                      {/* The ISO code, quiet: it disambiguates rather than names. */}
                      <span style={{ color: '#8c8c8c', fontVariantNumeric: 'tabular-nums' }}>
                        ({LOCALES[code].short})
                      </span>
                    </button>
                  </Col>
                );
              })}
            </Row>
          </section>
        ))}
      </div>
    </Modal>
  );
}
