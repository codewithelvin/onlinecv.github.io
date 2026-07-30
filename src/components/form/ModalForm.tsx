import type { JSX, ReactNode } from 'react';
import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { useModalChrome } from '../../hooks/useModalChrome';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useScopedId } from './field-scope';
import { VerticalFields } from './fields';

/**
 * Modal shell for item editors (spec §10.2 FR-14). Goes full-screen on `< lg`
 * (spec §10.3, see `useModalChrome`). The parent wires `onOk` to its RHF
 * `handleSubmit`. Fields are wrapped in `VerticalFields` so labels sit above
 * their controls even though the modal renders through a portal. The page
 * behind it cannot scroll (`useScrollLock`).
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
  const { modalProps } = useModalChrome(620);
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
      // Height, scrolling and the scrollbar gutter all come from `app-modal`
      // (see `useModalChrome`), so there is nothing left to state inline.
      {...modalProps}
    >
      <VerticalFields>{children}</VerticalFields>
    </Modal>
  );
}
