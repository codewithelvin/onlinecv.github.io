import { useMemo, useState } from 'react';
import type { HistoryItem } from '../../utils/sort-history';
import type { ResumeListSection } from '../../types/resume';
import { useResumeStore } from '../../state/store';
import { isAutoOrdered, isHistorySection, sortByRecency } from '../../utils/sort-history';

/** Sentinel index meaning "the add modal is open". */
const ADD = -1;

/**
 * The order controls a DATED section offers (`null` for the others, which have
 * no date to derive an order from). `SectionBody` renders the switch from this.
 */
export interface SectionOrder {
  /** True while the order comes from the dates rather than from the user. */
  auto: boolean;
  /** Back to newest-first. */
  setAuto: () => void;
  /** Freeze the order currently on screen and keep it. */
  setManual: () => void;
}

/**
 * Encapsulates the add/edit/remove/reorder boilerplate shared by every list
 * section. Generic over the item type; the store's list actions are cast once
 * to this item type (the store validates shape via its own typed signatures).
 *
 * For the dated sections `items` is the list as the CV reads it — newest first
 * (`utils/sort-history`) — not as it is stored, so the editor and the preview
 * agree about which entry is first. Every index this hook hands out or takes
 * back therefore addresses THAT array, which is why `move` cannot go through
 * `reorderItem`: see `store.setManualItemOrder`.
 */
export function useSectionEditor<Item extends { id: string }>(
  section: ResumeListSection,
): {
  items: Item[];
  index: number | null;
  isAdding: boolean;
  editingItem: Item | null;
  order: SectionOrder | null;
  openAdd: () => void;
  openEdit: (i: number) => void;
  close: () => void;
  save: (item: Item) => void;
  remove: (i: number) => void;
  move: (from: number, to: number) => void;
} {
  const stored = useResumeStore((s) => (s.resume[section] ?? []) as unknown as Item[]);
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
  const setManualItemOrder = useResumeStore((s) => s.setManualItemOrder);
  const setAutoItemOrder = useResumeStore((s) => s.setAutoItemOrder);

  const dated = isHistorySection(section) ? section : null;
  // A boolean, not the `manualOrder` array: a selector that returned the array
  // would be fine, but one that returned a derived array would re-render on
  // every store write. Sections with no dates read `false` and never sort.
  const auto = useResumeStore((s) => dated !== null && isAutoOrdered(s.resume, dated));

  const items = useMemo(
    () =>
      auto ? (sortByRecency(stored as unknown as HistoryItem[]) as unknown as Item[]) : stored,
    [auto, stored],
  );

  const [index, setIndex] = useState<number | null>(null);

  const editingItem = index !== null && index >= 0 ? (items[index] ?? null) : null;

  return {
    items,
    index,
    isAdding: index === ADD,
    editingItem,
    order:
      dated === null
        ? null
        : {
            auto,
            setAuto: () => setAutoItemOrder(dated),
            setManual: () =>
              setManualItemOrder(
                dated,
                items.map((x) => x.id),
              ),
          },
    openAdd: () => setIndex(ADD),
    openEdit: (i) => setIndex(i),
    close: () => setIndex(null),
    save: (item) => {
      if (index === ADD) add(section, item);
      else if (index !== null) update(section, item.id, item);
      setIndex(null);
    },
    remove: (i) => removeFromStore(section, items[i].id),
    move: (from, to) => {
      if (dated === null) return reorder(section, from, to);
      // Expressed as the whole new order rather than a pair of indices, because
      // `items` may be the SORTED view while the store holds the typed one — and
      // the same call is what takes the section off newest-first, since a
      // hand-made arrangement the next date edit re-sorted away would be a
      // silent revert of something the user just did on purpose.
      const ids = items.map((x) => x.id);
      if (from < 0 || from >= ids.length || to < 0 || to >= ids.length) return;
      const [moved] = ids.splice(from, 1);
      ids.splice(to, 0, moved);
      setManualItemOrder(dated, ids);
    },
  };
}
