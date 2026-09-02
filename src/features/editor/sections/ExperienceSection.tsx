import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { EmploymentType, ExperienceItem, Locale } from '../../../types/resume';
import { useResumeStore } from '../../../state/store';
import { createId } from '../../../utils/id';
import { FULL_DATE, makeDateFormatter } from '../../../utils/date';
import { dateRange } from '../../../templates/_core/render-helpers';
import { useDictionary } from '../../../hooks/useDictionary';
import { useSectionEditor } from '../useSectionEditor';
import { ExperienceModal } from '../modals/ExperienceModal';
import type { ExperienceFormValues } from '../schemas';
import { SectionBody } from './SectionBody';

const EMPTY: ExperienceFormValues = {
  position: '',
  positionCode: undefined,
  company: '',
  employmentType: undefined,
  location: '',
  locationCode: undefined,
  startDate: '',
  endDate: '',
  current: false,
  description: '',
  highlights: [],
};

/** `position` and `location` arrive already resolved into the UI language, so a
 *  value picked from a dictionary re-opens in the language the user is reading. */
function toValues(
  item: ExperienceItem,
  labels: { position: string; location: string },
): ExperienceFormValues {
  return {
    position: labels.position,
    positionCode: item.positionCode,
    company: item.company,
    employmentType: item.employmentType,
    location: labels.location,
    locationCode: item.locationCode,
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
    positionCode: v.positionCode || undefined,
    company: v.company,
    employmentType: (v.employmentType as EmploymentType | undefined) || undefined,
    location: v.location?.trim() || undefined,
    /** A code without its field would re-label a value that is no longer stored. */
    locationCode: v.location?.trim() ? v.locationCode || undefined : undefined,
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
  const positions = useDictionary('positions');
  const cities = useDictionary('cities');
  const ed = useSectionEditor<ExperienceItem>('experience');

  /** Listed values re-label with the UI language; typed ones stay as entered. */
  const position = (item: ExperienceItem): string =>
    positions.resolve(item.positionCode, item.position);
  const location = (item: ExperienceItem): string =>
    cities.resolve(item.locationCode, item.location ?? '');

  return (
    <SectionBody
      ids={ed.items.map((x) => x.id)}
      titles={ed.items.map(position)}
      subtitles={ed.items.map(
        (x) => `${x.company} · ${dateRange(x, fmt, FULL_DATE, t('common.present'))}`,
      )}
      addLabel={t('common.add')}
      order={ed.order}
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
          defaultValues={
            ed.editingItem
              ? toValues(ed.editingItem, {
                  position: position(ed.editingItem),
                  location: location(ed.editingItem),
                })
              : EMPTY
          }
          onSubmit={(v) => ed.save(toItem(v, ed.editingItem?.id ?? createId()))}
          onCancel={ed.close}
        />
      ) : null}
    </SectionBody>
  );
}
