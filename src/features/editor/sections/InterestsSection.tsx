import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { Interest } from '../../../types/resume';
import { createId } from '../../../utils/id';
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
  const ed = useSectionEditor<Interest>('interests');

  return (
    <SectionBody
      ids={ed.items.map((x) => x.id)}
      titles={ed.items.map((x) => x.name)}
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
          defaultValues={ed.editingItem ? { name: ed.editingItem.name, code: ed.editingItem.code } : EMPTY}
          onSubmit={(v) => ed.save(toItem(v, ed.editingItem?.id ?? createId()))}
          onCancel={ed.close}
        />
      ) : null}
    </SectionBody>
  );
}
