import type { JSX } from 'react';
import { App, Button, Tooltip } from 'antd';
import { FiSave } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../../state/store';
import { resumeSlug, triggerDownload } from '../../utils/download';
import { BACKUP_EXTENSION, BACKUP_MIME, serializeBackup } from './format';

/**
 * Today, local. Built from `Date` rather than through dayjs on purpose: dayjs
 * carries the app's current locale, and two of the twenty render digits in their
 * own script — an Arabic-Indic date in a FILENAME is not a date the user's file
 * manager will sort. `toISOString()` is out for the opposite reason: it is UTC,
 * so exporting at 01:00 in Baku would stamp the file with yesterday.
 */
function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Download the whole resume as a JSON file the user can keep and restore from
 * (spec FR-18). Lives on the editor screen only — the wizard owns the other
 * half, reading a file back.
 *
 * ⚠️ NOT gated by BR-4, unlike the PDF button beside it. The PDF is gated
 * because a CV with no name is not a CV worth handing to anyone; a backup of a
 * half-finished CV is exactly what someone needs before they close a browser
 * they may not come back to, and refusing it would withhold the feature at the
 * one moment it is most valuable.
 *
 * The filename carries the date because this file is meant to be KEPT, unlike
 * the PDF, which is sent and forgotten: a folder of dated backups sorts itself
 * and tells the user at a glance which one is the newest, where three files
 * called `Name_CV.json`, `Name_CV (1).json` and `Name_CV (2).json` tell them
 * nothing.
 *
 * `block` is what the phone uses: the button sits full-width at the foot of the
 * Edit tab rather than in the sticky action bar. That is not a preference —
 * MEASURED, a fourth control makes the bar wrap to two rows at every phone
 * width from 320 to 430 px (60 → 103 px), and a rarely-used action does not
 * deserve 43 px of permanent sticky screen. The desktop header has the room and
 * keeps it beside the PDF button, where both downloads belong together.
 */
export function BackupButton({ block }: { block?: boolean }): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const resume = useResumeStore((s) => s.resume);

  const onClick = (): void => {
    try {
      const blob = new Blob([serializeBackup(resume)], { type: BACKUP_MIME });
      triggerDownload(blob, `${resumeSlug(resume)}_CV_${today()}.${BACKUP_EXTENSION}`);
    } catch (error) {
      // The user gets the friendly message; the console gets the real one —
      // the same split as the PDF export, and for the same reason: a failure on
      // someone else's machine is otherwise undiagnosable.
      console.error('Backup export failed', error);
      void message.error(t('backup.downloadError'));
    }
  };

  return (
    <Tooltip title={t('backup.downloadHint')}>
      <Button
        id="backup-download"
        icon={<FiSave aria-hidden />}
        aria-label={t('backup.download')}
        block={block}
        onClick={onClick}
      >
        {t('backup.download')}
      </Button>
    </Tooltip>
  );
}
