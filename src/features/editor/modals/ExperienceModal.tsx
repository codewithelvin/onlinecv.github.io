import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ModalForm } from '../../../components/form/ModalForm';
import {
  RHFCheckbox,
  RHFDate,
  RHFLines,
  RHFSelect,
  RHFText,
  RHFTextArea,
} from '../../../components/form/fields';
import { yupResolver } from '../../../utils/yup-resolver';
import { experienceSchema, type ExperienceFormValues } from '../schemas';
import { EMPLOYMENT_TYPES, dictOptions } from '../enums';
import type { ItemModalProps } from './types';

export function ExperienceModal({
  open,
  title,
  defaultValues,
  onSubmit,
  onCancel,
}: ItemModalProps<ExperienceFormValues>): JSX.Element {
  const { t } = useTranslation();
  const { control, handleSubmit, watch } = useForm<ExperienceFormValues>({
    resolver: yupResolver<ExperienceFormValues>(experienceSchema),
    defaultValues,
  });
  const current = watch('current');
  return (
    <ModalForm open={open} title={title} onCancel={onCancel} onOk={handleSubmit(onSubmit)}>
      <RHFText control={control} name="position" label={t('fields.position')} maxLength={50} />
      <RHFText control={control} name="company" label={t('fields.company')} />
      <RHFSelect
        control={control}
        name="employmentType"
        label={t('fields.employmentType')}
        options={dictOptions(EMPLOYMENT_TYPES, t)}
        allowClear
      />
      <RHFText control={control} name="location" label={t('fields.location')} maxLength={100} />
      <RHFDate control={control} name="startDate" label={t('fields.startDate')} disabledFuture />
      <RHFCheckbox control={control} name="current" label={t('fields.currentExperience')} />
      {!current ? (
        <RHFDate control={control} name="endDate" label={t('fields.endDate')} disabledFuture />
      ) : null}
      <RHFTextArea
        control={control}
        name="description"
        label={t('fields.description')}
        maxLength={600}
      />
      <RHFLines control={control} name="highlights" label={t('fields.highlights')} />
    </ModalForm>
  );
}
