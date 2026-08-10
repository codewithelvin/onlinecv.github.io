import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageItem, LanguageLevel } from '../../../types/resume';
import { createId } from '../../../utils/id';
import { useDictionary } from '../../../hooks/useDictionary';
import { useSectionEditor } from '../useSectionEditor';
import { LanguageModal } from '../modals/LanguageModal';
import type { LanguageFormValues } from '../schemas';
import { SectionBody } from './SectionBody';

const EMPTY: LanguageFormValues = { name: '', level: 'B1', code: undefined };

export function LanguagesSection(): JSX.Element {
  const { t } = useTranslation();
  const languages = useDictionary('languages');
  const ed = useSectionEditor<LanguageItem>('languages');
  /** Dictionary languages re-label with the UI language; free-text ones don't. */
  const label = (item: LanguageItem): string => languages.resolve(item.code, item.name);

  const toItem = (v: LanguageFormValues, id: string): LanguageItem => ({
    id,
    code: v.code || undefined,
    name: v.name.trim(),
    level: v.level as LanguageLevel,
  });

  const levelLabel = (level: LanguageLevel): string =>
    level === 'native' ? t('dictionary.native') : level;

  return (
    <SectionBody
      ids={ed.items.map((x) => x.id)}
      titles={
        // Where there IS a code it is the stored truth, so the name follows the
        // UI language rather than the one it was added in; a typed language has
        // no code and keeps the words the user wrote.
        ed.items.map(label)
      }
      subtitles={ed.items.map((x) => levelLabel(x.level))}
      addLabel={t('common.add')}
      onAdd={ed.openAdd}
      onEdit={ed.openEdit}
      onRemove={ed.remove}
      onMove={ed.move}
    >
      {ed.index !== null ? (
        <LanguageModal
          key={ed.index}
          open
          title={ed.isAdding ? t('sections.languages') : t('common.edit')}
          defaultValues={
            ed.editingItem
              ? {
                  // The LABEL, not the stored snapshot: the field shows the same
                  // words the list does, in the UI language of the moment.
                  name: label(ed.editingItem),
                  level: ed.editingItem.level,
                  code: ed.editingItem.code,
                }
              : EMPTY
          }
          usedNames={ed.items.map(label)}
          onSubmit={(v) => ed.save(toItem(v, ed.editingItem?.id ?? createId()))}
          onCancel={ed.close}
        />
      ) : null}
    </SectionBody>
  );
}
