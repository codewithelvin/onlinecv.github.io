import { type ChangeEvent, type JSX, useRef, useState } from 'react';
import { App, Avatar, Button, Space } from 'antd';
import { FiCamera, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../../state/store';
import { AvatarCropperModal } from './AvatarCropperModal';

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Load (and, where supported, decode) an image off-screen so the cropper has
 * nothing left to wait for when it mounts. Decoding a multi-megapixel photo is
 * the slow part; doing it here means the delay happens while the button shows a
 * spinner instead of behind an empty modal.
 */
async function preloadImage(url: string): Promise<void> {
  const img = new Image();
  img.src = url;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Image failed to load'));
  });
  // Best-effort: `decode()` is unavailable on some browsers and can reject even
  // for a perfectly good image, so a failure here must not block the cropper.
  try {
    await img.decode();
  } catch {
    /* the cropper will decode it itself */
  }
}

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
  /** True between picking a file and the cropper being ready to show it. */
  const [preparing, setPreparing] = useState(false);

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  const onPick = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
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

    // Feedback FIRST: a large photo can take seconds to decode, and without this
    // the button looks inert and users click it again.
    setPreparing(true);
    const hideLoading = message.loading(t('avatar.preparing'), 0);
    const url = URL.createObjectURL(file);
    try {
      await preloadImage(url);
      setCropSrc(url);
    } catch {
      URL.revokeObjectURL(url);
      void message.error(t('avatar.notImage'));
    } finally {
      hideLoading();
      setPreparing(false);
    }
  };

  const closeCropper = (): void => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  return (
    <Space align="center" size="middle" wrap>
      <Avatar size={72} src={avatar} shape="circle" alt={initials}>
        {avatar ? null : initials || '?'}
      </Avatar>
      <Space>
        <Button
          icon={<FiCamera aria-hidden />}
          loading={preparing}
          aria-busy={preparing}
          onClick={() => inputRef.current?.click()}
        >
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
        onChange={(e) => void onPick(e)}
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
