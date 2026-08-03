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
  const faculties = useDictionary('faculties');
  const specialities = useDictionary('specialities');
  const { control, handleSubmit, watch } = useForm<EducationFormValues>({
    resolver: yupResolver<EducationFormValues>(educationSchema),
    defaultValues,
  });

  const type = watch('type');
  const current = watch('current');
  const institution = watch('institution');
  const faculty = watch('faculty');
  const specialization = watch('specialization');
  const institutionOptions =
    type === 'college' ? colleges.options : type === 'university' ? universities.options : [];
  /**
   * `school` has no dictionary, so nothing there can be recognized — and it must
   * not fall through to the university list either: the previous version handed a
   * school name to `universities.findByLabel`, so a school that happened to share
   * a university's name got that university's CODE and would then re-label itself
   * into it on a language switch. One lookup now drives both the tick and submit,
   * so the badge cannot claim something the saved record does not do.
   */
  const findInstitution =
    type === 'college'
      ? colleges.findByLabel
      : type === 'university'
        ? universities.findByLabel
        : null;

  const submit = handleSubmit((values) => {
    /**
     * Codes are resolved from the typed text, never from a hidden control: the
     * fields stay free-text (§13.1), so a value that happens to match a listed
     * faculty/speciality gains the code — and with it re-localization — while
     * anything else is stored verbatim. The lookup is fold-tolerant, so a label
     * typed without `ə`/`İ` still resolves (see `useDictionary.findByLabel`).
     */
    onSubmit({
      ...values,
      code: findInstitution?.(values.institution)?.code,
      facultyCode: values.faculty ? faculties.findByLabel(values.faculty)?.code : undefined,
      specializationCode: values.specialization
        ? specialities.findByLabel(values.specialization)?.code
        : undefined,
    });
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
        recognized={Boolean(institution && findInstitution?.(institution))}
        required
      />
      {type === 'university' ? (
        <RHFAutoComplete
          control={control}
          name="faculty"
          label={t('fields.faculty')}
          options={faculties.options}
          recognized={Boolean(faculty && faculties.findByLabel(faculty))}
        />
      ) : null}
      {type === 'university' || type === 'college' ? (
        <RHFAutoComplete
          control={control}
          name="specialization"
          label={t('fields.specialization')}
          options={specialities.options}
          recognized={Boolean(specialization && specialities.findByLabel(specialization))}
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
