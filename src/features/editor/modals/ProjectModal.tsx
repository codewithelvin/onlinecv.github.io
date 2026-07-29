import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ModalForm } from '../../../components/form/ModalForm';
import { RHFLines, RHFText, RHFTextArea } from '../../../components/form/fields';
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
      <RHFText control={control} name="name" label={t('fields.projectName')} maxLength={100} />
      <RHFText control={control} name="url" label={t('fields.projectUrl')} />
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
