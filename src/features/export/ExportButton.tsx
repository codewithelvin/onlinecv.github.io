import { type JSX, useState } from 'react';
import { App, Button, Tooltip } from 'antd';
import { FiDownload } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../../state/store';
import { canExport } from '../../utils/empty-resume';

/**
 * Download PDF button with BR-4 gating + lazy PDF export (spec §10.2/§17/§19).
 *
 * `compact` shortens the label to a bare "PDF": that is what buys the mobile
 * action bar the room its two secondaries need for labels of their own, and next
 * to the download arrow it still says what will happen. The full sentence stays
 * on as the accessible name.
 */
export function ExportButton({
  block,
  compact,
}: {
  block?: boolean;
  compact?: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const resume = useResumeStore((s) => s.resume);
  const [loading, setLoading] = useState(false);
  const enabled = canExport(resume);

  const onClick = async (): Promise<void> => {
    setLoading(true);
    try {
      const { exportResumePdf } = await import('../../services/pdf');
      await exportResumePdf(resume, resume.templateId);
    } catch {
      void message.error(t('export.error'));
    } finally {
      setLoading(false);
    }
  };

  const button = (
    <Button
      id="export-pdf"
      type="primary"
      icon={<FiDownload aria-hidden />}
      loading={loading}
      disabled={!enabled}
      block={block}
      aria-label={t('export.downloadPdf')}
      onClick={() => void onClick()}
    >
      {compact ? t('export.downloadPdfShort') : t('export.downloadPdf')}
    </Button>
  );

  return enabled ? button : <Tooltip title={t('export.disabledReason')}>{button}</Tooltip>;
}
