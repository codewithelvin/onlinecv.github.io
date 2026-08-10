import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ModalForm } from '../../../components/form/ModalForm';
import { RHFSelect, RHFText } from '../../../components/form/fields';
import { VALUE_DIR } from '../../../utils/bidi';
import { yupResolver } from '../../../utils/yup-resolver';
import { contactSchema, type ContactFormValues } from '../schemas';
import { contactTypeChoices, dictOptions } from '../enums';
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
        /* Retired channels are offered only to the item that already uses one
           (see `contactTypeChoices`) — otherwise editing a Skype contact saved
           years ago would show the raw code instead of its label. */
        options={dictOptions(contactTypeChoices(defaultValues.type), t)}
        required
      />
      {/* One field holds every channel — a phone number, a handle, a URL, an
          address — so its direction cannot come from the interface language.
          `VALUE_DIR` lets each value decide, which is what keeps the `+` in
          front of a country code in a right-to-left UI. See `utils/bidi`. */}
      <RHFText
        control={control}
        name="value"
        label={t('fields.contactValue')}
        dir={VALUE_DIR}
        required
      />
    </ModalForm>
  );
}
