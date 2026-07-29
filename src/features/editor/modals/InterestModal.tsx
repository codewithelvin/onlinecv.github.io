import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ModalForm } from '../../../components/form/ModalForm';
import { RHFAutoComplete } from '../../../components/form/fields';
import { yupResolver } from '../../../utils/yup-resolver';
import { interestSchema, type InterestFormValues } from '../schemas';
import { useDictionary } from '../../../hooks/useDictionary';
import type { ItemModalProps } from './types';

export function InterestModal({
  open,
  title,
  defaultValues,
  onSubmit,
  onCancel,
}: ItemModalProps<InterestFormValues>): JSX.Element {
  const { t } = useTranslation();
  const interests = useDictionary('interests');
  const { control, handleSubmit } = useForm<InterestFormValues>({
    resolver: yupResolver<InterestFormValues>(interestSchema),
    defaultValues,
  });
  const submit = handleSubmit((values) => {
    const entry = interests.findByLabel(values.name);
    onSubmit({ ...values, code: entry?.code });
  });
  return (
    <ModalForm open={open} title={title} onCancel={onCancel} onOk={submit}>
      <RHFAutoComplete
        control={control}
        name="name"
        label={t('fields.interestName')}
        options={interests.options}
        required
      />
    </ModalForm>
  );
}
