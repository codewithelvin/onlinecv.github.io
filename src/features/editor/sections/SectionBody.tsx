import type { JSX, ReactNode } from 'react';
import { Button, Space } from 'antd';
import { FiPlus } from 'react-icons/fi';
import { ItemList } from '../../../components/ItemList';
import { useScopedId } from '../../../components/form/field-scope';

/**
 * Shared body for list sections: the item list, an add button, and the modal
 * slot. The add button's id comes from the section's `FieldScope`
 * (`#experience-add`), so every list section gets one without passing a prop.
 */
export function SectionBody({
  ids,
  titles,
  subtitles,
  addLabel,
  onAdd,
  onEdit,
  onRemove,
  onMove,
  children,
}: {
  ids: string[];
  titles: string[];
  subtitles: string[];
  addLabel: string;
  onAdd: () => void;
  onEdit: (i: number) => void;
  onRemove: (i: number) => void;
  onMove: (from: number, to: number) => void;
  children?: ReactNode;
}): JSX.Element {
  const addId = useScopedId('add');
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
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
