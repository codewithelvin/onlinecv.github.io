import { useState } from 'react';
import type { ResumeListSection } from '../../types/resume';
import { useResumeStore } from '../../state/store';

/** Sentinel index meaning "the add modal is open". */
const ADD = -1;

/**
 * Encapsulates the add/edit/remove/reorder boilerplate shared by every list
 * section. Generic over the item type; the store's list actions are cast once
 * to this item type (the store validates shape via its own typed signatures).
 */
export function useSectionEditor<Item extends { id: string }>(section: ResumeListSection): {
  items: Item[];
  index: number | null;
  isAdding: boolean;
  editingItem: Item | null;
  openAdd: () => void;
  openEdit: (i: number) => void;
  close: () => void;
  save: (item: Item) => void;
  remove: (i: number) => void;
  move: (from: number, to: number) => void;
} {
  const items = useResumeStore((s) => (s.resume[section] ?? []) as unknown as Item[]);
  const add = useResumeStore((s) => s.addItem) as unknown as (
    section: ResumeListSection,
    item: Item,
  ) => void;
  const update = useResumeStore((s) => s.updateItem) as unknown as (
    section: ResumeListSection,
    id: string,
    item: Item,
  ) => void;
  const removeFromStore = useResumeStore((s) => s.removeItem);
  const reorder = useResumeStore((s) => s.reorderItem);

  const [index, setIndex] = useState<number | null>(null);

  const editingItem = index !== null && index >= 0 ? items[index] ?? null : null;

  return {
    items,
    index,
    isAdding: index === ADD,
    editingItem,
    openAdd: () => setIndex(ADD),
    openEdit: (i) => setIndex(i),
    close: () => setIndex(null),
    save: (item) => {
      if (index === ADD) add(section, item);
      else if (index !== null) update(section, item.id, item);
      setIndex(null);
    },
    remove: (i) => removeFromStore(section, items[i].id),
    move: (from, to) => reorder(section, from, to),
  };
}
