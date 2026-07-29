import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { Certification, Locale } from '../../../types/resume';
import { useResumeStore } from '../../../state/store';
import { createId } from '../../../utils/id';
import { MONTH_YEAR, makeDateFormatter } from '../../../utils/date';
import { useSectionEditor } from '../useSectionEditor';
import { CertificationModal } from '../modals/CertificationModal';
import type { CertificationFormValues } from '../schemas';
import { SectionBody } from './SectionBody';

const EMPTY: CertificationFormValues = {
  name: '',
  organization: '',
  issueDate: '',
  expirationDate: '',
  credentialId: '',
  credentialUrl: '',
  comment: '',
};

function toValues(item: Certification): CertificationFormValues {
  return {
    name: item.name,
    organization: item.organization,
    issueDate: item.issueDate,
    expirationDate: item.expirationDate ?? '',
    credentialId: item.credentialId ?? '',
    credentialUrl: item.credentialUrl ?? '',
    comment: item.comment ?? '',
  };
}

function toItem(v: CertificationFormValues, id: string): Certification {
  return {
    id,
    name: v.name.trim(),
    organization: v.organization.trim(),
    issueDate: v.issueDate,
    expirationDate: v.expirationDate || undefined,
    credentialId: v.credentialId?.trim() || undefined,
    credentialUrl: v.credentialUrl?.trim() || undefined,
    comment: v.comment?.trim() || undefined,
  };
}

export function CertificationsSection(): JSX.Element {
  const { t } = useTranslation();
  const uiLocale = useResumeStore((s) => s.uiLocale) as Locale;
  const fmt = makeDateFormatter(uiLocale);
  const ed = useSectionEditor<Certification>('certifications');

  return (
    <SectionBody
      ids={ed.items.map((x) => x.id)}
      titles={ed.items.map((x) => x.name)}
      subtitles={ed.items.map((x) =>
        [x.organization, x.issueDate ? fmt(x.issueDate, MONTH_YEAR) : ''].filter(Boolean).join(' · '),
      )}
      addLabel={t('common.add')}
      onAdd={ed.openAdd}
      onEdit={ed.openEdit}
      onRemove={ed.remove}
      onMove={ed.move}
    >
      {ed.index !== null ? (
        <CertificationModal
          key={ed.index}
          open
          title={ed.isAdding ? t('sections.certifications') : t('common.edit')}
          defaultValues={ed.editingItem ? toValues(ed.editingItem) : EMPTY}
          onSubmit={(v) => ed.save(toItem(v, ed.editingItem?.id ?? createId()))}
          onCancel={ed.close}
        />
      ) : null}
    </SectionBody>
  );
}
