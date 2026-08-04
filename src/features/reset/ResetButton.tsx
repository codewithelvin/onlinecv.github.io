import type { JSX } from 'react';
import { Button, Popconfirm } from 'antd';
import { FiRotateCcw } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../../state/store';

/**
 * Reset the resume to an empty default after explicit confirmation (BR-8).
 *
 * Labelled everywhere, phone included: a lone counter-clockwise arrow is read as
 * "undo" as readily as "start over", and the two are not the same offer. The
 * mobile action bar makes room for the text by shortening the export button
 * instead.
 *
 * It throws away every word the user has typed, so it is marked `danger` — red
 * outline rather than a red fill, because a solid red button beside the solid
 * blue "download" would read as the second half of a pair of primary actions
 * instead of the one thing on the screen to be careful with. The confirmation's
 * own OK button IS filled red: by then it is the action being taken.
 */
export function ResetButton(): JSX.Element {
  const { t } = useTranslation();
  const resetResume = useResumeStore((s) => s.resetResume);
  return (
    <Popconfirm
      title={t('common.resetConfirm')}
      okText={t('common.yes')}
      cancelText={t('common.no')}
      okButtonProps={{ id: 'reset-cv-confirm', danger: true }}
      onConfirm={() => void resetResume()}
    >
      <Button
        id="reset-cv"
        danger
        icon={<FiRotateCcw aria-hidden />}
        aria-label={t('common.reset')}
        title={t('common.reset')}
      >
        {t('common.reset')}
      </Button>
    </Popconfirm>
  );
}
