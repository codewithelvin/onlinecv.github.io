import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ModalForm } from '../../../components/form/ModalForm';
import { RHFSelect, RHFText } from '../../../components/form/fields';
import { yupResolver } from '../../../utils/yup-resolver';
import { contactSchema, type ContactFormValues } from '../schemas';
import { CONTACT_TYPES, dictOptions } from '../enums';
import type { ItemModalProps } from './types';

export function ContactModal({
  open,
  title,
  defaultValues,
  onSubmit,
  onCancel,
}: ItemModalProps<ContactFormValues>): JSX.Element {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<ContactFormValues>({
    resolver: yupResolver<ContactFormValues>(contactSchema),
    defaultValues,
  });
  return (
    <ModalForm open={open} title={title} onCancel={onCancel} onOk={handleSubmit(onSubmit)}>
      <RHFSelect
        control={control}
        name="type"
        label={t('fields.contactType')}
        options={dictOptions(CONTACT_TYPES, t)}
      />
      <RHFText control={control} name="value" label={t('fields.contactValue')} />
    </ModalForm>
  );
}
