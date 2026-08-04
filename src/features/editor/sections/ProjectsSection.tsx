import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectItem } from '../../../types/resume';
import { VALUE_DIR } from '../../../utils/bidi';
import { createId } from '../../../utils/id';
import { useSectionEditor } from '../useSectionEditor';
import { ProjectModal } from '../modals/ProjectModal';
import type { ProjectFormValues } from '../schemas';
import { SectionBody } from './SectionBody';

const EMPTY: ProjectFormValues = { name: '', url: '', description: '', highlights: [] };

function toValues(item: ProjectItem): ProjectFormValues {
  return {
    name: item.name,
    url: item.url ?? '',
    description: item.description ?? '',
    highlights: item.highlights ?? [],
  };
}

function toItem(v: ProjectFormValues, id: string): ProjectItem {
  return {
    id,
    name: v.name.trim(),
    url: v.url?.trim() || undefined,
    description: v.description?.trim() || undefined,
    highlights: (v.highlights ?? []).map((s) => (s ?? '').trim()).filter(Boolean),
  };
}

export function ProjectsSection(): JSX.Element {
  const { t } = useTranslation();
  const ed = useSectionEditor<ProjectItem>('projects');

  return (
    <SectionBody
      ids={ed.items.map((x) => x.id)}
      titles={ed.items.map((x) => x.name)}
      /* The URL owns its direction, so a trailing `/` cannot jump to the other
         end of it in a right-to-left UI (`utils/bidi`). */
      subtitles={ed.items.map((x) => (x.url ? <span dir={VALUE_DIR}>{x.url}</span> : ''))}
      addLabel={t('common.add')}
      onAdd={ed.openAdd}
      onEdit={ed.openEdit}
      onRemove={ed.remove}
      onMove={ed.move}
    >
      {ed.index !== null ? (
        <ProjectModal
          key={ed.index}
          open
          title={ed.isAdding ? t('sections.projects') : t('common.edit')}
          defaultValues={ed.editingItem ? toValues(ed.editingItem) : EMPTY}
          onSubmit={(v) => ed.save(toItem(v, ed.editingItem?.id ?? createId()))}
          onCancel={ed.close}
        />
      ) : null}
    </SectionBody>
  );
}
