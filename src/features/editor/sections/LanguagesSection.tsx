import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageItem, LanguageLevel } from '../../../types/resume';
import { createId } from '../../../utils/id';
import { useDictionary } from '../../../hooks/useDictionary';
import { useSectionEditor } from '../useSectionEditor';
import { LanguageModal } from '../modals/LanguageModal';
import type { LanguageFormValues } from '../schemas';
import { SectionBody } from './SectionBody';

const EMPTY: LanguageFormValues = { code: '', level: 'B1' };

export function LanguagesSection(): JSX.Element {
  const { t } = useTranslation();
  const languages = useDictionary('languages');
  const ed = useSectionEditor<LanguageItem>('languages');

  const toItem = (v: LanguageFormValues, id: string): LanguageItem => ({
    id,
    code: v.code,
    name: languages.resolve(v.code, v.code),
    level: v.level as LanguageLevel,
  });

  const levelLabel = (level: LanguageLevel): string =>
    level === 'native' ? t('dictionary.native') : level;

  return (
    <SectionBody
      ids={ed.items.map((x) => x.id)}
      titles={
        // The code is the stored truth (hard constraint, one of the 17), so the
        // name follows the UI language, not the one it was added in.
        ed.items.map((x) => languages.resolve(x.code, x.name))
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
            ed.editingItem ? { code: ed.editingItem.code, level: ed.editingItem.level } : EMPTY
          }
          usedCodes={ed.items.map((x) => x.code)}
          onSubmit={(v) => ed.save(toItem(v, ed.editingItem?.id ?? createId()))}
          onCancel={ed.close}
        />
      ) : null}
    </SectionBody>
  );
}
