import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageItem, LanguageLevel, Locale } from '../../../types/resume';
import { createId } from '../../../utils/id';
import { useDictionary } from '../../../hooks/useDictionary';
import { useSectionEditor } from '../useSectionEditor';
import { LanguageModal } from '../modals/LanguageModal';
import type { LanguageFormValues } from '../schemas';
import { SectionBody } from './SectionBody';

const EMPTY: LanguageFormValues = { code: '', level: 'B1' };

export function LanguagesSection(): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const languages = useDictionary('languages');
  const ed = useSectionEditor<LanguageItem>('languages');

  const toItem = (v: LanguageFormValues, id: string): LanguageItem => ({
    id,
    code: v.code,
    name: languages.findByCode(v.code)?.[locale] ?? v.code,
    level: v.level as LanguageLevel,
  });

  const levelLabel = (level: LanguageLevel): string =>
    level === 'native' ? t('dictionary.native') : level;

  return (
    <SectionBody
      ids={ed.items.map((x) => x.id)}
      titles={ed.items.map((x) => x.name)}
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
          defaultValues={ed.editingItem ? { code: ed.editingItem.code, level: ed.editingItem.level } : EMPTY}
          onSubmit={(v) => ed.save(toItem(v, ed.editingItem?.id ?? createId()))}
          onCancel={ed.close}
        />
      ) : null}
    </SectionBody>
  );
}
