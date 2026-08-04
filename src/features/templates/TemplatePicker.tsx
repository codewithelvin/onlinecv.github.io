import { type JSX, useState } from 'react';
import { Badge, Button, Card, Col, Image, Modal, Row, Tag, Tooltip } from 'antd';
import { FiLayout, FiZoomIn } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../../state/store';
import { toLocale } from '../../app/i18n/locales';
import { localizedText } from '../../utils/localized-text';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useModalChrome } from '../../hooks/useModalChrome';
import { getModalContainer } from '../../utils/modal-container';
import { listTemplates } from '../../templates/_core/registry';
import type { TemplateManifest } from '../../templates/_core/contract';

/** Fallback ring colour for a template that declares no `accent`. */
const FALLBACK_ACCENT = '#1461c7';

/**
 * Templates button + gallery modal (spec §10.2). The button is labelled
 * everywhere — a bare layout glyph named nothing on a phone. `compact` marks the
 * mobile action bar's copy of it, which only changes the button's id so the two
 * placements stay separately addressable by test automation.
 *
 * A thumbnail shrunk into a card is only ever a hint at a layout, never a
 * readable page, so every card also carries a magnifier that opens the shot at
 * its natural size. The button stops the click from bubbling — the card itself
 * is the "choose this template" target.
 */
export function TemplatePicker({ compact }: { compact?: boolean } = {}): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = toLocale(i18n.language);
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState<TemplateManifest | null>(null);
  const templateId = useResumeStore((s) => s.resume.templateId);
  const setTemplate = useResumeStore((s) => s.setTemplate);
  const templates = listTemplates();
  const { fullScreen, modalProps } = useModalChrome(920);
  useScrollLock(open);

  const close = (): void => {
    setZoomed(null);
    setOpen(false);
  };

  return (
    <>
      <Button
        id={compact ? 'template-picker-compact' : 'template-picker'}
        icon={<FiLayout aria-hidden />}
        onClick={() => setOpen(true)}
        aria-label={t('header.templates')}
        title={t('header.templates')}
      >
        {t('header.templates')}
      </Button>
      <Modal
        open={open}
        title={t('templatePicker.title')}
        /**
         * The gallery has no Save — picking a card closes it — so Close IS its
         * footer, and it is not optional: no app modal draws a close cross any
         * more (`useModalChrome`), so without this button a dialog that is
         * full-screen on a phone would have no visible way out at all.
         */
        footer={
          <Button id="template-picker-close" block={fullScreen} onClick={close}>
            {t('common.close')}
          </Button>
        }
        onCancel={close}
        {...modalProps}
        /* After the spread: `template-gallery` squares up the body padding that
           the shared form layout reserves for a scrollbar. */
        className={`${modalProps.className ?? ''} template-gallery`.trim()}
      >
        {/* `align="stretch"` + `height: 100%` down the chain: without it a card
            whose description is empty (the non-ATS templates carry no tag) ends
            up shorter than its neighbours. */}
        <Row gutter={[20, 20]} align="stretch" style={{ margin: '10px -5px' }}>
          {templates.map(({ manifest }) => {
            const selected = manifest.id === templateId;
            const name = localizedText(manifest.name, locale);
            const accent = manifest.accent ?? FALLBACK_ACCENT;
            const card = (
              <Card
                id={`template-option-${manifest.id}`}
                className={selected ? 'template-card template-card-selected' : 'template-card'}
                hoverable
                onClick={() => {
                  setTemplate(manifest.id);
                  close();
                }}
                styles={{ body: { padding: 16 } }}
                style={{
                  height: '100%',
                  /**
                   * Selection is a RING, not a thicker border: a 2px border
                   * would resize the picture inside the card and only ever be
                   * drawn at half width along three of its four edges (see the
                   * `.template-card` note in `index.css`). A `box-shadow` is
                   * outside the box, so it costs no layout and stays even.
                   */
                  ...(selected
                    ? {
                        borderColor: accent,
                        boxShadow: `0 0 0 1px ${accent}`,
                      }
                    : {}),
                }}
                cover={
                  <div style={{ position: 'relative' }}>
                    {/*
                     * A fixed card-shaped crop anchored to the TOP of the shot:
                     * every card keeps the same silhouette whatever its
                     * thumbnail's aspect ratio, and what survives the crop is
                     * the part that identifies a template — the header, and the
                     * accent column if it has one.
                     */}
                    <img
                      alt={name}
                      src={manifest.thumbnail}
                      style={{
                        display: 'block',
                        width: '100%',
                        aspectRatio: '4 / 3',
                        objectFit: 'cover',
                        objectPosition: 'top center',
                      }}
                    />
                    <Button
                      id={`template-zoom-${manifest.id}`}
                      icon={<FiZoomIn aria-hidden />}
                      size={fullScreen ? 'large' : 'middle'}
                      aria-label={t('templatePicker.zoom')}
                      title={t('templatePicker.zoom')}
                      onClick={(event) => {
                        event.stopPropagation();
                        setZoomed(manifest);
                      }}
                      style={{
                        position: 'absolute',
                        /* Logical, not `right`: it has to mirror with the rest of
                           the UI in a right-to-left locale (`LocaleMeta.dir`). */
                        insetInlineEnd: 8,
                        bottom: 8,
                        /* Reads as a control sitting ON the picture rather than
                           as part of it, whatever the thumbnail behind it. */
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.16)',
                      }}
                    />
                  </div>
                }
              >
                <Card.Meta
                  title={name}
                  description={
                    manifest.atsSafe ? (
                      <Tooltip title={t('templatePicker.atsSafeHint')}>
                        {/* antd's green-7 tag text (#389e0d) is only ~3.6:1 on
                            the tag's pale background; green-8 clears WCAG AA. */}
                        <Tag color="green" style={{ color: '#237804' }}>
                          {t('templatePicker.atsSafe')}
                        </Tag>
                      </Tooltip>
                    ) : null
                  }
                />
              </Card>
            );
            return (
              <Col xs={24} sm={12} md={8} key={manifest.id} className="template-picker-col">
                {selected ? <Badge.Ribbon text="✓">{card}</Badge.Ribbon> : card}
              </Col>
            );
          })}
        </Row>
        {/*
         * The lightbox, driven from the magnifier buttons. The `<img>` itself is
         * never shown — antd's documented way of opening a preview from an
         * outside trigger is a hidden `Image` with a controlled `preview`.
         *
         * `getContainer` matters: rc-image locks BODY scrolling when it portals
         * into `document.body`, and that lock is exactly what
         * `utils/modal-container` exists to avoid (it breaks the sticky preview
         * pane and drops the page scroll position). Sharing `#modal-root` keeps
         * the app's own root-level lock in charge.
         */}
        {zoomed ? (
          <Image
            src={zoomed.thumbnail}
            alt={localizedText(zoomed.name, locale)}
            style={{ display: 'none' }}
            preview={{
              visible: true,
              src: zoomed.thumbnail,
              getContainer: getModalContainer,
              onVisibleChange: (visible) => {
                if (!visible) setZoomed(null);
              },
            }}
          />
        ) : null}
      </Modal>
    </>
  );
}
