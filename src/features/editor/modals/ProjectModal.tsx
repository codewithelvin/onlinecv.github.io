import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ModalForm } from '../../../components/form/ModalForm';
import { RHFLines, RHFText, RHFTextArea } from '../../../components/form/fields';
import { VALUE_DIR } from '../../../utils/bidi';
import { yupResolver } from '../../../utils/yup-resolver';
import { projectSchema, type ProjectFormValues } from '../schemas';
import type { ItemModalProps } from './types';

export function ProjectModal({
  open,
  title,
  defaultValues,
  onSubmit,
  onCancel,
}: ItemModalProps<ProjectFormValues>): JSX.Element {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<ProjectFormValues>({
    resolver: yupResolver<ProjectFormValues>(projectSchema),
    defaultValues,
  });
  return (
    <ModalForm open={open} title={title} onCancel={onCancel} onOk={handleSubmit(onSubmit)}>
      <RHFText
        control={control}
        name="name"
        label={t('fields.projectName')}
        maxLength={100}
        required
      />
      {/* A URL, not prose — see `utils/bidi`. */}
      <RHFText control={control} name="url" label={t('fields.projectUrl')} dir={VALUE_DIR} />
      <RHFTextArea
        control={control}
        name="description"
        label={t('fields.projectDescription')}
        maxLength={600}
      />
      <RHFLines control={control} name="highlights" label={t('fields.highlights')} />
    </ModalForm>
  );
}
