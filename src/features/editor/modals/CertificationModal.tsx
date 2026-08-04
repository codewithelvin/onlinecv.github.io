import type { JSX } from 'react';
import { Col, Row } from 'antd';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ModalForm } from '../../../components/form/ModalForm';
import { RHFDate, RHFText } from '../../../components/form/fields';
import { VALUE_DIR } from '../../../utils/bidi';
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
      <RHFText
        control={control}
        name="name"
        label={t('fields.certificateName')}
        maxLength={100}
        required
      />
      <RHFText control={control} name="organization" label={t('fields.organization')} required />
      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <RHFDate
            control={control}
            name="issueDate"
            label={t('fields.issueDate')}
            picker="month"
            required
          />
        </Col>
        <Col xs={24} sm={12}>
          <RHFDate
            control={control}
            name="expirationDate"
            label={t('fields.expirationDate')}
            picker="month"
          />
        </Col>
      </Row>
      {/* Identifiers, not prose — they read the same way in every UI language
          (`utils/bidi`). */}
      <RHFText
        control={control}
        name="credentialId"
        label={t('fields.credentialId')}
        dir={VALUE_DIR}
        maxLength={100}
      />
      <RHFText
        control={control}
        name="credentialUrl"
        label={t('fields.credentialUrl')}
        dir={VALUE_DIR}
      />
    </ModalForm>
  );
}
