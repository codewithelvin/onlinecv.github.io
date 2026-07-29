import type { JSX } from 'react';
import { Col, Row } from 'antd';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ModalForm } from '../../../components/form/ModalForm';
import {
  RHFAutoComplete,
  RHFCheckbox,
  RHFDate,
  RHFSelect,
  RHFText,
} from '../../../components/form/fields';
import { yupResolver } from '../../../utils/yup-resolver';
import { educationSchema, type EducationFormValues } from '../schemas';
import { DEGREE_LEVELS, EDUCATION_TYPES, dictOptions } from '../enums';
import { useDictionary } from '../../../hooks/useDictionary';
import type { ItemModalProps } from './types';

export function EducationModal({
  open,
  title,
  defaultValues,
  onSubmit,
  onCancel,
}: ItemModalProps<EducationFormValues>): JSX.Element {
  const { t } = useTranslation();
  const universities = useDictionary('universities');
  const colleges = useDictionary('colleges');
  const { control, handleSubmit, watch } = useForm<EducationFormValues>({
    resolver: yupResolver<EducationFormValues>(educationSchema),
    defaultValues,
  });

  const type = watch('type');
  const current = watch('current');
  const institutionOptions =
    type === 'college' ? colleges.options : type === 'university' ? universities.options : [];

  const submit = handleSubmit((values) => {
    const finder = values.type === 'college' ? colleges.findByLabel : universities.findByLabel;
    const entry = finder(values.institution);
    onSubmit({ ...values, code: entry?.code });
  });

  return (
    <ModalForm open={open} title={title} onCancel={onCancel} onOk={submit}>
      <RHFSelect
        control={control}
        name="type"
        label={t('fields.educationType')}
        options={dictOptions(EDUCATION_TYPES, t)}
        required
      />
      <RHFAutoComplete
        control={control}
        name="institution"
        label={t('fields.institution')}
        options={institutionOptions}
        required
      />
      {type === 'university' ? (
        <RHFText
          control={control}
          name="faculty"
          label={t('fields.faculty')}
          maxLength={100}
          required
        />
      ) : null}
      {type === 'university' || type === 'college' ? (
        <RHFText
          control={control}
          name="specialization"
          label={t('fields.specialization')}
          maxLength={100}
          required
        />
      ) : null}
      {type === 'university' ? (
        <RHFSelect
          control={control}
          name="degree"
          label={t('fields.degree')}
          options={dictOptions(DEGREE_LEVELS, t)}
          allowClear
          required
        />
      ) : null}
      {/* Admission/graduation years side by side; graduation is disabled rather
          than removed while "currently studying" is checked. */}
      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <RHFDate
            control={control}
            name="startDate"
            label={t('fields.admissionYear')}
            picker="month"
            required
          />
        </Col>
        <Col xs={24} sm={12}>
          <RHFDate
            control={control}
            name="endDate"
            label={t('fields.graduationYear')}
            picker="month"
            disabled={current}
          />
        </Col>
      </Row>
      <RHFCheckbox control={control} name="current" label={t('fields.currentEducation')} />
      <RHFText control={control} name="comment" label={t('fields.comment')} maxLength={50} />
    </ModalForm>
  );
}
