import { type JSX, useState } from 'react';
import { Badge, Button, Card, Col, Modal, Row, Tag } from 'antd';
import { FiLayout } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../../state/store';
import { toLocale } from '../../app/i18n/locales';
import { localizedText } from '../../utils/localized-text';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useModalChrome } from '../../hooks/useModalChrome';
import { listTemplates } from '../../templates/_core/registry';

/**
 * Templates button + gallery modal (spec §10.2). `compact` drops the text label
 * (keeping the accessible name) so the mobile action bar fits without scrolling
 * sideways.
 */
export function TemplatePicker({ compact }: { compact?: boolean } = {}): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = toLocale(i18n.language);
  const [open, setOpen] = useState(false);
  const templateId = useResumeStore((s) => s.resume.templateId);
  const setTemplate = useResumeStore((s) => s.setTemplate);
  const templates = listTemplates();
  const { fullScreen, modalProps } = useModalChrome(720);
  useScrollLock(open);

  return (
    <>
      <Button
        id={compact ? 'template-picker-compact' : 'template-picker'}
        icon={<FiLayout aria-hidden />}
        onClick={() => setOpen(true)}
        aria-label={t('header.templates')}
        title={t('header.templates')}
      >
        {compact ? null : t('header.templates')}
      </Button>
      <Modal
        open={open}
        title={t('templatePicker.title')}
        /**
         * Picking a card closes the gallery, so on desktop the close cross is
         * the only way to back out and no footer is needed. Full-screen hides
         * that cross — and there is no mask left to tap either — so the way out
         * has to become a real button.
         */
        footer={
          fullScreen ? (
            <Button id="template-picker-close" block onClick={() => setOpen(false)}>
              {t('common.close')}
            </Button>
          ) : null
        }
        onCancel={() => setOpen(false)}
        {...modalProps}
      >
        {/* `align="stretch"` + `height: 100%` down the chain: without it a card
            whose description is empty (the non-ATS templates carry no tag) ends
            up shorter than its neighbours. */}
        <Row gutter={[16, 16]} align="stretch">
          {templates.map(({ manifest }) => {
            const selected = manifest.id === templateId;
            const card = (
              <Card
                id={`template-option-${manifest.id}`}
                hoverable
                onClick={() => {
                  setTemplate(manifest.id);
                  setOpen(false);
                }}
                styles={{ body: { padding: 12 } }}
                style={{
                  height: '100%',
                  ...(selected ? { borderColor: manifest.accent, borderWidth: 2 } : {}),
                }}
                cover={
                  <img
                    alt={localizedText(manifest.name, locale)}
                    src={manifest.thumbnail}
                    style={{ height: 160, objectFit: 'cover' }}
                  />
                }
              >
                <Card.Meta
                  title={
                    <span>
                      <span
                        aria-hidden
                        style={{
                          display: 'inline-block',
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          background: manifest.accent ?? '#999',
                          marginRight: 8,
                        }}
                      />
                      {localizedText(manifest.name, locale)}
                    </span>
                  }
                  description={
                    manifest.atsSafe ? (
                      // antd's green-7 tag text (#389e0d) is only ~3.6:1 on the
                      // tag's pale background; green-8 clears WCAG AA.
                      <Tag color="green" style={{ color: '#237804' }}>
                        {t('templatePicker.atsSafe')}
                      </Tag>
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
      </Modal>
    </>
  );
}
