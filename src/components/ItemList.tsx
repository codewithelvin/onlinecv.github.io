import type { CSSProperties, JSX, ReactNode } from 'react';
import { Button, List, Popconfirm, Space, Typography } from 'antd';
import { FiChevronDown, FiChevronUp, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../hooks/useResponsive';
import { useScopedId } from './form/field-scope';

/**
 * Generic list of resume items with edit / delete / reorder controls.
 * Reordering uses accessible move up/down buttons (the keyboard/tap fallback to
 * drag, spec §10.2/§10.3), so it works with keyboard, mouse, and touch.
 *
 * On `< lg` the controls move BELOW the item text as a full-width row of 44px
 * targets (spec §10.3). Kept as `List.Item` `actions` they sat inline with the
 * title: four icon buttons squeezed against wrapping text, each far under the
 * minimum touch size — the "hard to press tiny buttons" on a phone.
 */
export interface ItemListProps {
  ids: string[];
  titles: string[];
  subtitles: string[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  /** When provided, renders accessible up/down reorder controls. */
  onMove?: (from: number, to: number) => void;
}

/** Minimum touch target (spec §10.3). */
const TOUCH_SIZE = 44;

export function ItemList({
  ids,
  titles,
  subtitles,
  onEdit,
  onRemove,
  onMove,
}: ItemListProps): JSX.Element | null {
  const { t } = useTranslation();
  const { isMobile } = useResponsive();
  // `#experience-item-0-edit` etc. — the row index, not the item's uuid, so a
  // test-automation script can address "the first entry" without reading state.
  const scope = useScopedId('item');

  if (ids.length === 0) {
    return <Typography.Text type="secondary">{t('emptyState.noItems')}</Typography.Text>;
  }

  /** Comfortable on a phone, unobtrusive with a mouse. */
  const buttonProps: { size: 'large' | 'small'; style?: CSSProperties } = isMobile
    ? {
        size: 'large',
        style: {
          width: TOUCH_SIZE,
          height: TOUCH_SIZE,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
        },
      }
    : { size: 'small' };

  const controlId = (index: number, action: string): string | undefined =>
    scope ? `${scope}-${index}-${action}` : undefined;

  const controls = (index: number): ReactNode[] => [
    ...(onMove
      ? [
          <Button
            key="up"
            id={controlId(index, 'up')}
            type="text"
            {...buttonProps}
            aria-label={t('common.moveUp')}
            disabled={index === 0}
            icon={<FiChevronUp aria-hidden />}
            onClick={() => onMove(index, index - 1)}
          />,
          <Button
            key="down"
            id={controlId(index, 'down')}
            type="text"
            {...buttonProps}
            aria-label={t('common.moveDown')}
            disabled={index === ids.length - 1}
            icon={<FiChevronDown aria-hidden />}
            onClick={() => onMove(index, index + 1)}
          />,
        ]
      : []),
    <Button
      key="edit"
      id={controlId(index, 'edit')}
      type="text"
      {...buttonProps}
      aria-label={t('common.edit')}
      icon={<FiEdit2 aria-hidden />}
      onClick={() => onEdit(index)}
    />,
    <Popconfirm
      key="del"
      title={t('common.deleteConfirm')}
      okText={t('common.yes')}
      cancelText={t('common.no')}
      okButtonProps={{ id: controlId(index, 'delete-confirm') }}
      onConfirm={() => onRemove(index)}
    >
      <Button
        id={controlId(index, 'delete')}
        type="text"
        danger
        {...buttonProps}
        aria-label={t('common.delete')}
        icon={<FiTrash2 aria-hidden />}
      />
    </Popconfirm>,
  ];

  return (
    <List
      size="small"
      dataSource={ids}
      renderItem={(id, index) => {
        const text = (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{titles[index] || '—'}</Typography.Text>
            {subtitles[index] ? (
              <Typography.Text type="secondary">{subtitles[index]}</Typography.Text>
            ) : null}
          </Space>
        );
        return (
          <List.Item
            key={id}
            id={scope ? `${scope}-${index}` : undefined}
            actions={isMobile ? undefined : controls(index)}
          >
            {isMobile ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {text}
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  {controls(index)}
                </div>
              </div>
            ) : (
              text
            )}
          </List.Item>
        );
      }}
    />
  );
}
