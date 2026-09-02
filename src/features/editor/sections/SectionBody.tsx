import type { JSX, ReactNode } from 'react';
import { Button, Select, Space, Typography } from 'antd';
import { FiPlus } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { ItemList } from '../../../components/ItemList';
import { useScopedId } from '../../../components/form/field-scope';
import type { SectionOrder } from '../useSectionEditor';

/**
 * Shared body for list sections: the order switch, the item list, an add button,
 * and the modal slot. The add button's id comes from the section's `FieldScope`
 * (`#experience-add`), so every list section gets one without passing a prop.
 */
export function SectionBody({
  ids,
  titles,
  subtitles,
  addLabel,
  order,
  onAdd,
  onEdit,
  onRemove,
  onMove,
  children,
}: {
  ids: string[];
  titles: string[];
  /** See `ItemListProps.subtitles` — a node, so a value can own its direction. */
  subtitles: ReactNode[];
  addLabel: string;
  /** Present for the DATED sections only — see `useSectionEditor`. */
  order?: SectionOrder | null;
  onAdd: () => void;
  onEdit: (i: number) => void;
  onRemove: (i: number) => void;
  onMove: (from: number, to: number) => void;
  children?: ReactNode;
}): JSX.Element {
  const { t } = useTranslation();
  const addId = useScopedId('add');
  const orderId = useScopedId('order');
  const orderLabelId = useScopedId('order-label');
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {/* Below two entries there is no order to choose, so the row would be
          chrome explaining a decision the user cannot yet have made. */}
      {order && ids.length > 1 ? (
        <div
          // State as an attribute, not as a rendered word: automation reads the
          // mode without having to recognize a translated label.
          data-order-mode={order.auto ? 'auto' : 'manual'}
          style={{ display: 'flex', justifyContent: 'flex-end' }}
        >
          <Space size="small">
            {/* A plain Text, not a <label>, so point the combobox at it
                explicitly — otherwise the control is unnamed for screen readers. */}
            <Typography.Text type="secondary" id={orderLabelId}>
              {t('order.label')}:
            </Typography.Text>
            <Select
              id={orderId}
              size="small"
              variant="borderless"
              aria-labelledby={orderLabelId}
              value={order.auto ? 'auto' : 'manual'}
              onChange={(value: 'auto' | 'manual') =>
                value === 'auto' ? order.setAuto() : order.setManual()
              }
              options={[
                { value: 'auto', label: t('order.auto') },
                { value: 'manual', label: t('order.manual') },
              ]}
              // Two options can never overflow `listHeight`, but the rule holds
              // regardless: what is offered has to be in the DOM (see
              // `CvLanguageSelect` for the bug that taught it).
              virtual={false}
              style={{ minWidth: 132 }}
            />
          </Space>
        </div>
      ) : null}
      <ItemList
        ids={ids}
        titles={titles}
        subtitles={subtitles}
        onEdit={onEdit}
        onRemove={onRemove}
        onMove={onMove}
      />
      <Button id={addId} icon={<FiPlus aria-hidden />} onClick={onAdd} block>
        {addLabel}
      </Button>
      {children}
    </Space>
  );
}
