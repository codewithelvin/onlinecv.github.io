import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ModalForm } from '../../../components/form/ModalForm';
import { RHFDate, RHFText } from '../../../components/form/fields';
import { yupResolver } from '../../../utils/yup-resolver';
import { certificationSchema, type CertificationFormValues } from '../schemas';
import type { ItemModalProps } from './types';

export function CertificationModal({
  open,
  title,
  defaultValues,
  onSubmit,
  onCancel,
}: ItemModalProps<CertificationFormValues>): JSX.Element {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<CertificationFormValues>({
    resolver: yupResolver<CertificationFormValues>(certificationSchema),
    defaultValues,
  });
  return (
    <ModalForm open={open} title={title} onCancel={onCancel} onOk={handleSubmit(onSubmit)}>
      <RHFText control={control} name="name" label={t('fields.certificateName')} maxLength={100} />
      <RHFText control={control} name="organization" label={t('fields.organization')} />
      <RHFDate control={control} name="issueDate" label={t('fields.issueDate')} picker="month" />
      <RHFDate
        control={control}
        name="expirationDate"
        label={t('fields.expirationDate')}
        picker="month"
      />
      <RHFText
        control={control}
        name="credentialId"
        label={t('fields.credentialId')}
        maxLength={100}
      />
      <RHFText control={control} name="credentialUrl" label={t('fields.credentialUrl')} />
    </ModalForm>
  );
}
