import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { Interest } from '../../../types/resume';
import { createId } from '../../../utils/id';
import { useDictionary } from '../../../hooks/useDictionary';
import { useSectionEditor } from '../useSectionEditor';
import { InterestModal } from '../modals/InterestModal';
import type { InterestFormValues } from '../schemas';
import { SectionBody } from './SectionBody';

const EMPTY: InterestFormValues = { name: '', code: undefined };

function toItem(v: InterestFormValues, id: string): Interest {
  return { id, name: v.name.trim(), code: v.code || undefined };
}

export function InterestsSection(): JSX.Element {
  const { t } = useTranslation();
  const interests = useDictionary('interests');
  const ed = useSectionEditor<Interest>('interests');
  /** Dictionary interests re-label with the UI language; free-text ones don't. */
  const label = (item: Interest): string => interests.resolve(item.code, item.name);

  return (
    <SectionBody
      ids={ed.items.map((x) => x.id)}
      titles={ed.items.map(label)}
      subtitles={ed.items.map(() => '')}
      addLabel={t('common.add')}
      onAdd={ed.openAdd}
      onEdit={ed.openEdit}
      onRemove={ed.remove}
      onMove={ed.move}
    >
      {ed.index !== null ? (
        <InterestModal
          key={ed.index}
          open
          title={ed.isAdding ? t('sections.interests') : t('common.edit')}
          defaultValues={
            ed.editingItem ? { name: label(ed.editingItem), code: ed.editingItem.code } : EMPTY
          }
          onSubmit={(v) => ed.save(toItem(v, ed.editingItem?.id ?? createId()))}
          onCancel={ed.close}
        />
      ) : null}
    </SectionBody>
  );
}
