import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { Skill } from '../../../types/resume';
import { createId } from '../../../utils/id';
import { useSectionEditor } from '../useSectionEditor';
import { SkillModal } from '../modals/SkillModal';
import type { SkillFormValues } from '../schemas';
import { SectionBody } from './SectionBody';

const EMPTY: SkillFormValues = { name: '', level: 50, code: undefined };

function toValues(item: Skill): SkillFormValues {
  return { name: item.name, level: item.level, code: item.code };
}

function toItem(v: SkillFormValues, id: string): Skill {
  return { id, name: v.name.trim(), level: v.level, code: v.code || undefined };
}

export function SkillsSection(): JSX.Element {
  const { t } = useTranslation();
  const ed = useSectionEditor<Skill>('skills');

  return (
    <SectionBody
      ids={ed.items.map((x) => x.id)}
      titles={ed.items.map((x) => x.name)}
      subtitles={ed.items.map((x) => `${x.level}%`)}
      addLabel={t('common.add')}
      onAdd={ed.openAdd}
      onEdit={ed.openEdit}
      onRemove={ed.remove}
      onMove={ed.move}
    >
      {ed.index !== null ? (
        <SkillModal
          key={ed.index}
          open
          title={ed.isAdding ? t('sections.skills') : t('common.edit')}
          defaultValues={ed.editingItem ? toValues(ed.editingItem) : EMPTY}
          onSubmit={(v) => ed.save(toItem(v, ed.editingItem?.id ?? createId()))}
          onCancel={ed.close}
        />
      ) : null}
    </SectionBody>
  );
}
