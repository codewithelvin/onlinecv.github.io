import { type JSX, useCallback, useId, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Modal, Slider, Spin, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { getModalContainer } from '../../utils/modal-container';
import { getCroppedImage } from './cropImage';

/**
 * Full-featured avatar cropper (spec FR-15): pan / zoom / rotate to frame a
 * square crop, then downscale + JPEG-compress to a small base64 data URL.
 */
export function AvatarCropperModal({
  open,
  imageSrc,
  onCancel,
  onDone,
}: {
  open: boolean;
  imageSrc: string;
  onCancel: () => void;
  onDone: (dataUrl: string) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  /** react-easy-crop paints an empty box until it has measured the image. */
  const [loaded, setLoaded] = useState(false);
  const zoomId = useId();
  const rotateId = useId();

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const handleOk = async (): Promise<void> => {
    if (!area) return;
    setBusy(true);
    try {
      const dataUrl = await getCroppedImage(imageSrc, area, rotation);
      onDone(dataUrl);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={t('avatar.title')}
      onCancel={onCancel}
      onOk={() => void handleOk()}
      okText={t('avatar.addStepButton')}
      cancelText={t('common.cancel')}
      confirmLoading={busy}
      maskClosable={false}
      destroyOnHidden
      getContainer={getModalContainer}
    >
      <Typography.Paragraph type="secondary">{t('avatar.step2')}</Typography.Paragraph>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 300,
          background: '#333',
          borderRadius: 8,
        }}
        aria-busy={!loaded}
      >
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          onMediaLoaded={() => setLoaded(true)}
        />
        {/* A very large photo can still take a moment here even after preloading,
            and the empty dark box otherwise reads as a broken modal. */}
        {!loaded ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Spin tip={t('avatar.preparing')} />
          </div>
        ) : null}
      </div>
      <label htmlFor={zoomId}>
        <Typography.Text>{t('avatar.zoom')}</Typography.Text>
      </label>
      <Slider id={zoomId} min={1} max={3} step={0.05} value={zoom} onChange={setZoom} />
      <label htmlFor={rotateId}>
        <Typography.Text>{t('avatar.rotate')}</Typography.Text>
      </label>
      <Slider id={rotateId} min={0} max={360} step={1} value={rotation} onChange={setRotation} />
    </Modal>
  );
}
