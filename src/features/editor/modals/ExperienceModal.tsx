import type { JSX } from 'react';
import { Col, Row } from 'antd';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ModalForm } from '../../../components/form/ModalForm';
import {
  RHFAutoComplete,
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
import { useDictionary } from '../../../hooks/useDictionary';
import type { ItemModalProps } from './types';

export function ExperienceModal({
  open,
  title,
  defaultValues,
  onSubmit,
  onCancel,
}: ItemModalProps<ExperienceFormValues>): JSX.Element {
  const { t } = useTranslation();
  const positions = useDictionary('positions');
  const cities = useDictionary('cities');
  const { control, handleSubmit, watch } = useForm<ExperienceFormValues>({
    resolver: yupResolver<ExperienceFormValues>(experienceSchema),
    defaultValues,
  });
  const current = watch('current');
  const position = watch('position');
  const location = watch('location');

  /** Same contract as the education fields: free text stands, a listed title or
   *  city additionally gains the code that re-labels it on a CV-language switch. */
  const submit = handleSubmit((values) =>
    onSubmit({
      ...values,
      positionCode: values.position ? positions.findByLabel(values.position)?.code : undefined,
      locationCode: values.location ? cities.findByLabel(values.location)?.code : undefined,
    }),
  );

  return (
    <ModalForm open={open} title={title} onCancel={onCancel} onOk={submit}>
      <RHFAutoComplete
        control={control}
        name="position"
        label={t('fields.position')}
        options={positions.options}
        recognized={Boolean(position && positions.findByLabel(position))}
        required
      />
      <RHFText control={control} name="company" label={t('fields.company')} required />
      <RHFSelect
        control={control}
        name="employmentType"
        label={t('fields.employmentType')}
        options={dictOptions(EMPLOYMENT_TYPES, t)}
        allowClear
      />
      <RHFAutoComplete
        control={control}
        name="location"
        label={t('fields.location')}
        options={cities.options}
        recognized={Boolean(location && cities.findByLabel(location))}
      />
      {/* Start/end dates sit side by side. The end picker is disabled rather than
          removed while "currently working here" is checked, so the two-column
          grid never collapses under the user. */}
      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <RHFDate
            control={control}
            name="startDate"
            label={t('fields.startDate')}
            disabledFuture
            required
          />
        </Col>
        <Col xs={24} sm={12}>
          <RHFDate
            control={control}
            name="endDate"
            label={t('fields.endDate')}
            disabledFuture
            disabled={current}
          />
        </Col>
      </Row>
      <RHFCheckbox control={control} name="current" label={t('fields.currentExperience')} />
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
