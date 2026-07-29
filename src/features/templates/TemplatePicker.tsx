import { type JSX, useState } from 'react';
import { Badge, Button, Card, Col, Modal, Row, Tag } from 'antd';
import { FiLayout } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import type { Locale } from '../../types/resume';
import { useResumeStore } from '../../state/store';
import { listTemplates } from '../../templates/_core/registry';

/** Templates button + gallery modal (spec §10.2). */
export function TemplatePicker(): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language as Locale) ?? 'az';
  const [open, setOpen] = useState(false);
  const templateId = useResumeStore((s) => s.resume.templateId);
  const setTemplate = useResumeStore((s) => s.setTemplate);
  const templates = listTemplates();

  return (
    <>
      <Button icon={<FiLayout aria-hidden />} onClick={() => setOpen(true)}>
        {t('header.templates')}
      </Button>
      <Modal
        open={open}
        title={t('templatePicker.title')}
        footer={null}
        onCancel={() => setOpen(false)}
        width={720}
      >
        <Row gutter={[16, 16]}>
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
                style={selected ? { borderColor: manifest.accent, borderWidth: 2 } : undefined}
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
                    manifest.atsSafe ? <Tag color="green">{t('templatePicker.atsSafe')}</Tag> : null
                  }
                />
              </Card>
            );
            return (
              <Col xs={24} sm={12} md={8} key={manifest.id}>
                {selected ? <Badge.Ribbon text="✓">{card}</Badge.Ribbon> : card}
              </Col>
            );
          })}
        </Row>
      </Modal>
    </>
  );
}
