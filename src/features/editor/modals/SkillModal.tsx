import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ModalForm } from '../../../components/form/ModalForm';
import { RHFAutoComplete, RHFNumber } from '../../../components/form/fields';
import { yupResolver } from '../../../utils/yup-resolver';
import { skillSchema, type SkillFormValues } from '../schemas';
import { useDictionary } from '../../../hooks/useDictionary';
import type { ItemModalProps } from './types';

export function SkillModal({
  open,
  title,
  defaultValues,
  onSubmit,
  onCancel,
}: ItemModalProps<SkillFormValues>): JSX.Element {
  const { t } = useTranslation();
  const skills = useDictionary('skills');
  const { control, handleSubmit } = useForm<SkillFormValues>({
    resolver: yupResolver<SkillFormValues>(skillSchema),
    defaultValues,
  });

  const submit = handleSubmit((values) => {
    const entry = skills.findByLabel(values.name);
    onSubmit({ ...values, code: entry?.code });
  });

  return (
    <ModalForm open={open} title={title} onCancel={onCancel} onOk={submit}>
      <RHFAutoComplete
        control={control}
        name="name"
        label={t('fields.skillName')}
        options={skills.options}
      />
      <RHFNumber control={control} name="level" label={t('fields.skillLevel')} min={1} max={100} />
    </ModalForm>
  );
}
