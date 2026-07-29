import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { EmploymentType, ExperienceItem, Locale } from '../../../types/resume';
import { useResumeStore } from '../../../state/store';
import { createId } from '../../../utils/id';
import { FULL_DATE, makeDateFormatter } from '../../../utils/date';
import { dateRange } from '../../../templates/_core/render-helpers';
import { useSectionEditor } from '../useSectionEditor';
import { ExperienceModal } from '../modals/ExperienceModal';
import type { ExperienceFormValues } from '../schemas';
import { SectionBody } from './SectionBody';

const EMPTY: ExperienceFormValues = {
  position: '',
  company: '',
  employmentType: undefined,
  location: '',
  startDate: '',
  endDate: '',
  current: false,
  description: '',
  highlights: [],
};

function toValues(item: ExperienceItem): ExperienceFormValues {
  return {
    position: item.position,
    company: item.company,
    employmentType: item.employmentType,
    location: item.location ?? '',
    startDate: item.startDate,
    endDate: item.endDate ?? '',
    current: item.current,
    description: item.description ?? '',
    highlights: item.highlights ?? [],
  };
}

function toItem(v: ExperienceFormValues, id: string): ExperienceItem {
  return {
    id,
    position: v.position,
    company: v.company,
    employmentType: (v.employmentType as EmploymentType | undefined) || undefined,
    location: v.location?.trim() || undefined,
    startDate: v.startDate,
    endDate: v.current ? undefined : v.endDate || undefined,
    current: v.current ?? false,
    description: v.description?.trim() || undefined,
    highlights: (v.highlights ?? []).map((s) => (s ?? '').trim()).filter(Boolean),
  };
}

export function ExperienceSection(): JSX.Element {
  const { t } = useTranslation();
  const uiLocale = useResumeStore((s) => s.uiLocale) as Locale;
  const fmt = makeDateFormatter(uiLocale);
  const ed = useSectionEditor<ExperienceItem>('experience');

  return (
    <SectionBody
      ids={ed.items.map((x) => x.id)}
      titles={ed.items.map((x) => x.position)}
      subtitles={ed.items.map(
        (x) => `${x.company} · ${dateRange(x, fmt, FULL_DATE, t('common.present'))}`,
      )}
      addLabel={t('common.add')}
      onAdd={ed.openAdd}
      onEdit={ed.openEdit}
      onRemove={ed.remove}
      onMove={ed.move}
    >
      {ed.index !== null ? (
        <ExperienceModal
          key={ed.index}
          open
          title={ed.isAdding ? t('sections.experience') : t('common.edit')}
          defaultValues={ed.editingItem ? toValues(ed.editingItem) : EMPTY}
          onSubmit={(v) => ed.save(toItem(v, ed.editingItem?.id ?? createId()))}
          onCancel={ed.close}
        />
      ) : null}
    </SectionBody>
  );
}
