import { type JSX, useState } from 'react';
import { Badge, Button, Card, Col, Modal, Row, Tag } from 'antd';
import { FiLayout } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import type { Locale } from '../../types/resume';
import { useResumeStore } from '../../state/store';
import { getModalContainer } from '../../utils/modal-container';
import { listTemplates } from '../../templates/_core/registry';

/**
 * Templates button + gallery modal (spec §10.2). `compact` drops the text label
 * (keeping the accessible name) so the mobile action bar fits without scrolling
 * sideways.
 */
export function TemplatePicker({ compact }: { compact?: boolean } = {}): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language as Locale) ?? 'az';
  const [open, setOpen] = useState(false);
  const templateId = useResumeStore((s) => s.resume.templateId);
  const setTemplate = useResumeStore((s) => s.setTemplate);
  const templates = listTemplates();

  return (
    <>
      <Button
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
        footer={null}
        onCancel={() => setOpen(false)}
        width={720}
        getContainer={getModalContainer}
      >
        {/* `align="stretch"` + `height: 100%` down the chain: without it a card
            whose description is empty (the non-ATS templates carry no tag) ends
            up shorter than its neighbours. */}
        <Row gutter={[16, 16]} align="stretch">
          {templates.map(({ manifest }) => {
            const selected = manifest.id === templateId;
            const card = (
              <Card
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
                    alt={manifest.name[locale]}
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
                      {manifest.name[locale]}
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
