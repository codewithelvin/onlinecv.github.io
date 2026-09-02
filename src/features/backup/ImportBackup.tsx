import { type JSX, useState } from 'react';
import { App, Button, Typography, Upload } from 'antd';
import { FiUploadCloud } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../../state/store';
import { BACKUP_EXTENSION, MAX_BACKUP_BYTES, parseBackup } from './format';

/**
 * Restore a resume from a backup file (spec FR-18). Lives on the wizard screen
 * only — the editor owns the other half, writing the file.
 *
 * That split is the user's, and it is also the only one that makes sense: the
 * wizard is the screen a browser with no stored CV shows, which is precisely the
 * situation a restore is for — a new laptop, a cleared profile, a phone. A
 * returning visitor never sees this screen, because they have the CV already.
 *
 * Offered BESIDE the first step's fields rather than as a step of its own. A
 * chooser in front of the wizard would tax every first-time user — the large
 * majority, who have no file — with a decision, to save a click for the few who
 * do; a labelled alternative under the form costs the typing path nothing.
 *
 * No confirmation: at the wizard there is nothing to lose. The store holds an
 * empty resume, and the only thing a restore discards is whatever the user has
 * typed into the two fields above it, which is by definition less than the
 * contents of the file they just picked.
 */
export function ImportBackup(): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const importResume = useResumeStore((s) => s.importResume);
  const [busy, setBusy] = useState(false);

  const restore = async (file: File): Promise<void> => {
    setBusy(true);
    try {
      // Checked before the read, not after: the point of a bound is to not pull
      // the file into memory in the first place.
      if (file.size > MAX_BACKUP_BYTES) {
        void message.error(t('backup.error.tooBig'));
        return;
      }
      const result = parseBackup(await file.text());
      if (!result.ok) {
        void message.error(t(`backup.error.${result.error}`));
        return;
      }
      if (result.dropped.length > 0) {
        /**
         * Said out loud, with a count. A file this app wrote restores with
         * nothing dropped; anything else has been hand-edited or truncated, and
         * quietly loading 90% of someone's CV while reporting success is how they
         * find out about the other 10% from a recruiter. The paths go to the
         * console because they are field names, not sentences to translate.
         */
        console.warn('Backup restored with omissions', result.dropped);
        void message.warning(t('backup.restoredPartial', { n: result.dropped.length }));
      } else {
        void message.success(t('backup.restored'));
      }
      // Last, and after the message: this replaces the screen with the editor.
      importResume(result.resume);
    } catch (error) {
      console.error('Backup restore failed', error);
      void message.error(t('backup.error.unreadable'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        marginTop: 20,
        paddingTop: 16,
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'flex-start',
      }}
    >
      {/* One sentence, no heading above it (user's call 2026-09-02). It names
          where the file came from and what the button does, which is what a
          heading would only have repeated — and at the default size rather than
          the usual 12 px hint, since it is now the block's whole explanation. */}
      <Typography.Text type="secondary">{t('backup.restoreHint')}</Typography.Text>
      <Upload
        // The `<input type="file">` itself, so automation can hand it a file.
        id="backup-file"
        accept={`.${BACKUP_EXTENSION},application/json`}
        maxCount={1}
        showUploadList={false}
        /**
         * `false`, not `true`: this is the whole reason the component can exist
         * in an app with no backend. Returning false stops rc-upload before its
         * request, so the file is read locally and never sent anywhere — with no
         * `action` set, letting it proceed would have it POST the user's CV at
         * the app's own URL.
         */
        beforeUpload={(file) => {
          void restore(file);
          return false;
        }}
      >
        <Button id="backup-restore" icon={<FiUploadCloud aria-hidden />} loading={busy}>
          {t('backup.restoreButton')}
        </Button>
      </Upload>
    </div>
  );
}
