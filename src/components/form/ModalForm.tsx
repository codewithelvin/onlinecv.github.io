import type { JSX, ReactNode } from 'react';
import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../../hooks/useResponsive';
import { useScrollLock } from '../../hooks/useScrollLock';
import { getModalContainer } from '../../utils/modal-container';
import { useScopedId } from './field-scope';
import { VerticalFields } from './fields';

/**
 * Modal shell for item editors (spec §10.2 FR-14). Goes full-screen on `< lg`
 * (spec §10.3). The parent wires `onOk` to its RHF `handleSubmit`. Fields are
 * wrapped in `VerticalFields` so labels sit above their controls even though the
 * modal renders through a portal. The page behind it cannot scroll
 * (`useScrollLock`).
 */
export function ModalForm({
  open,
  title,
  onCancel,
  onOk,
  children,
}: {
  open: boolean;
  title: string;
  onCancel: () => void;
  onOk: () => void;
  children: ReactNode;
}): JSX.Element {
  const { t } = useTranslation();
  const { isMobile } = useResponsive();
  useScrollLock(open);
  // Ids come from the section's `FieldScope` — the modal renders through a
  // portal, but React context flows through those, so this is `#experience-save`
  // when the experience section opened it.
  const saveId = useScopedId('save');
  const cancelId = useScopedId('cancel');
  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      onOk={onOk}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      okButtonProps={{ id: saveId }}
      cancelButtonProps={{ id: cancelId }}
      maskClosable={false}
      destroyOnHidden
      getContainer={getModalContainer}
      width={isMobile ? '100%' : 620}
      style={isMobile ? { top: 0, maxWidth: '100vw', margin: 0, paddingBottom: 0 } : { top: 32 }}
      styles={{ body: { maxHeight: '68vh', overflowY: 'auto', overflowX: 'hidden' } }}
    >
      <VerticalFields>{children}</VerticalFields>
    </Modal>
  );
}
