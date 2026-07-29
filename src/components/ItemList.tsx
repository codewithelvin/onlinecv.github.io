import type { JSX } from 'react';
import { Button, List, Popconfirm, Space, Typography } from 'antd';
import { FiChevronDown, FiChevronUp, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

/**
 * Generic list of resume items with edit / delete / reorder controls.
 * Reordering uses accessible move up/down buttons (the keyboard/tap fallback to
 * drag, spec §10.2/§10.3), so it works with keyboard, mouse, and touch.
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

export function ItemList({
  ids,
  titles,
  subtitles,
  onEdit,
  onRemove,
  onMove,
}: ItemListProps): JSX.Element | null {
  const { t } = useTranslation();
  if (ids.length === 0) {
    return <Typography.Text type="secondary">{t('emptyState.noItems')}</Typography.Text>;
  }
  return (
    <List
      size="small"
      dataSource={ids}
      renderItem={(id, index) => (
        <List.Item
          key={id}
          actions={[
            ...(onMove
              ? [
                  <Button
                    key="up"
                    type="text"
                    size="small"
                    aria-label={t('common.moveUp')}
                    disabled={index === 0}
                    icon={<FiChevronUp aria-hidden />}
                    onClick={() => onMove(index, index - 1)}
                  />,
                  <Button
                    key="down"
                    type="text"
                    size="small"
                    aria-label={t('common.moveDown')}
                    disabled={index === ids.length - 1}
                    icon={<FiChevronDown aria-hidden />}
                    onClick={() => onMove(index, index + 1)}
                  />,
                ]
              : []),
            <Button
              key="edit"
              type="text"
              size="small"
              aria-label={t('common.edit')}
              icon={<FiEdit2 aria-hidden />}
              onClick={() => onEdit(index)}
            />,
            <Popconfirm
              key="del"
              title={t('common.deleteConfirm')}
              okText={t('common.yes')}
              cancelText={t('common.no')}
              onConfirm={() => onRemove(index)}
            >
              <Button
                type="text"
                size="small"
                danger
                aria-label={t('common.delete')}
                icon={<FiTrash2 aria-hidden />}
              />
            </Popconfirm>,
          ]}
        >
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{titles[index] || '—'}</Typography.Text>
            {subtitles[index] ? (
              <Typography.Text type="secondary">{subtitles[index]}</Typography.Text>
            ) : null}
          </Space>
        </List.Item>
      )}
    />
  );
}
