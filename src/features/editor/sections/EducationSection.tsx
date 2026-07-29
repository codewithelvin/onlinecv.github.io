import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { DegreeLevel, EducationItem, EducationType, Locale } from '../../../types/resume';
import { useResumeStore } from '../../../state/store';
import { createId } from '../../../utils/id';
import { MONTH_YEAR, makeDateFormatter } from '../../../utils/date';
import { dateRange } from '../../../templates/_core/render-helpers';
import { useDictionary } from '../../../hooks/useDictionary';
import { useSectionEditor } from '../useSectionEditor';
import { EducationModal } from '../modals/EducationModal';
import type { EducationFormValues } from '../schemas';
import { SectionBody } from './SectionBody';

const EMPTY: EducationFormValues = {
  type: 'university',
  institution: '',
  faculty: '',
  specialization: '',
  degree: 'bachelor',
  startDate: '',
  endDate: '',
  current: false,
  comment: '',
  code: undefined,
};

function toValues(item: EducationItem, institution: string): EducationFormValues {
  return {
    type: item.type,
    institution,
    faculty: item.faculty ?? '',
    specialization: item.specialization ?? '',
    degree: item.degree ?? undefined,
    startDate: item.startDate,
    endDate: item.endDate ?? '',
    current: item.current,
    comment: item.comment ?? '',
    code: item.code,
  };
}

function toItem(v: EducationFormValues, id: string): EducationItem {
  const type = v.type as EducationType;
  return {
    id,
    type,
    code: v.code || undefined,
    institution: v.institution,
    faculty: type === 'university' ? v.faculty?.trim() || undefined : undefined,
    specialization:
      type === 'university' || type === 'college' ? v.specialization?.trim() || undefined : undefined,
    degree: type === 'university' ? (v.degree as DegreeLevel | undefined) || undefined : undefined,
    startDate: v.startDate,
    endDate: v.current ? undefined : v.endDate || undefined,
    current: v.current ?? false,
    comment: v.comment?.trim() || undefined,
  };
}

export function EducationSection(): JSX.Element {
  const { t } = useTranslation();
  const uiLocale = useResumeStore((s) => s.uiLocale) as Locale;
  const fmt = makeDateFormatter(uiLocale);
  const universities = useDictionary('universities');
  const colleges = useDictionary('colleges');
  const ed = useSectionEditor<EducationItem>('education');

  /** Listed institutions re-label with the UI language; typed ones (and schools,
   *  which have no dictionary) keep the text as entered. */
  const institution = (item: EducationItem): string => {
    if (item.type === 'college') return colleges.resolve(item.code, item.institution);
    if (item.type === 'university') return universities.resolve(item.code, item.institution);
    return item.institution;
  };

  return (
    <SectionBody
      ids={ed.items.map((x) => x.id)}
      titles={ed.items.map(institution)}
      subtitles={ed.items.map((x) => {
        const label = x.degree ? t(`dictionary.${x.degree}`) : t(`dictionary.${x.type}`);
        return `${label} · ${dateRange(x, fmt, MONTH_YEAR, t('common.present'))}`;
      })}
      addLabel={t('common.add')}
      onAdd={ed.openAdd}
      onEdit={ed.openEdit}
      onRemove={ed.remove}
      onMove={ed.move}
    >
      {ed.index !== null ? (
        <EducationModal
          key={ed.index}
          open
          title={ed.isAdding ? t('sections.education') : t('common.edit')}
          defaultValues={
            ed.editingItem ? toValues(ed.editingItem, institution(ed.editingItem)) : EMPTY
          }
          onSubmit={(v) => ed.save(toItem(v, ed.editingItem?.id ?? createId()))}
          onCancel={ed.close}
        />
      ) : null}
    </SectionBody>
  );
}
