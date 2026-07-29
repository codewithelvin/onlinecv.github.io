import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { DegreeLevel, EducationItem, EducationType, Locale } from '../../../types/resume';
import { useResumeStore } from '../../../state/store';
import { createId } from '../../../utils/id';
import { MONTH_YEAR, makeDateFormatter } from '../../../utils/date';
import { dateRange } from '../../../templates/_core/render-helpers';
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

function toValues(item: EducationItem): EducationFormValues {
  return {
    type: item.type,
    institution: item.institution,
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
  const ed = useSectionEditor<EducationItem>('education');

  return (
    <SectionBody
      ids={ed.items.map((x) => x.id)}
      titles={ed.items.map((x) => x.institution)}
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
          defaultValues={ed.editingItem ? toValues(ed.editingItem) : EMPTY}
          onSubmit={(v) => ed.save(toItem(v, ed.editingItem?.id ?? createId()))}
          onCancel={ed.close}
        />
      ) : null}
    </SectionBody>
  );
}
