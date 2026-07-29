import { type ChangeEvent, type JSX, useRef, useState } from 'react';
import { App, Avatar, Button, Space } from 'antd';
import { FiCamera, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../../state/store';
import { AvatarCropperModal } from './AvatarCropperModal';

const MAX_BYTES = 10 * 1024 * 1024;

/** Avatar picker + cropper trigger (spec FR-11). No cover image. */
export function AvatarField(): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const avatar = useResumeStore((s) => s.resume.media.avatar);
  const firstName = useResumeStore((s) => s.resume.basics.firstName);
  const lastName = useResumeStore((s) => s.resume.basics.lastName);
  const setAvatar = useResumeStore((s) => s.setAvatar);

  const inputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  const onPick = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      void message.error(t('avatar.notImage'));
      return;
    }
    if (file.size > MAX_BYTES) {
      void message.error(t('avatar.tooLarge'));
      return;
    }
    setCropSrc(URL.createObjectURL(file));
  };

  const closeCropper = (): void => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  return (
    <Space align="center" size="middle" wrap>
      <Avatar size={72} src={avatar} shape="circle">
        {avatar ? null : initials || '?'}
      </Avatar>
      <Space>
        <Button icon={<FiCamera aria-hidden />} onClick={() => inputRef.current?.click()}>
          {avatar ? t('avatar.change') : t('avatar.select')}
        </Button>
        {avatar ? (
          <Button danger icon={<FiTrash2 aria-hidden />} onClick={() => setAvatar(undefined)}>
            {t('avatar.remove')}
          </Button>
        ) : null}
      </Space>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onPick}
        aria-label={t('avatar.select')}
      />
      {cropSrc ? (
        <AvatarCropperModal
          open
          imageSrc={cropSrc}
          onCancel={closeCropper}
          onDone={(dataUrl) => {
            setAvatar(dataUrl);
            closeCropper();
          }}
        />
      ) : null}
    </Space>
  );
}
