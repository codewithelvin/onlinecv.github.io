import { type JSX, useState } from 'react';
import { Button, Card, Space, Steps, Typography } from 'antd';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { Gender, MaritalStatus } from '../../types/resume';
import { useResumeStore } from '../../state/store';
import { yupResolver } from '../../utils/yup-resolver';
import {
  RHFAutoComplete,
  RHFDate,
  RHFSelect,
  RHFText,
} from '../../components/form/fields';
import { useDictionary } from '../../hooks/useDictionary';
import {
  type WizardStep1Values,
  type WizardStep2Values,
  wizardStep1Schema,
  wizardStep2Schema,
} from '../editor/schemas';
import { GENDERS, MARITAL_STATUSES, dictOptions } from '../editor/enums';

/** First-run 2-step wizard (spec FR-13/§10.2): identity → profile basics. */
export function Wizard(): JSX.Element {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [step1, setStep1] = useState<WizardStep1Values | null>(null);

  const updateBasics = useResumeStore((s) => s.updateBasics);
  const updateGeneralInfo = useResumeStore((s) => s.updateGeneralInfo);
  const updateContactEmail = useResumeStore((s) => s.updateContactEmail);
  const nationality = useDictionary('nationality');

  const f1 = useForm<WizardStep1Values>({
    resolver: yupResolver<WizardStep1Values>(wizardStep1Schema),
    defaultValues: { firstName: '', lastName: '', email: '', dateOfBirth: '' },
  });
  const f2 = useForm<WizardStep2Values>({
    resolver: yupResolver<WizardStep2Values>(wizardStep2Schema),
    defaultValues: { headline: '', gender: 'male', maritalStatus: 'single', nationality: '' },
  });

  const next = f1.handleSubmit((values) => {
    setStep1(values);
    setStep(1);
  });

  const finish = f2.handleSubmit((values) => {
    if (!step1) return;
    updateBasics({ firstName: step1.firstName, lastName: step1.lastName, headline: values.headline });
    updateContactEmail(step1.email);
    updateGeneralInfo({
      dateOfBirth: step1.dateOfBirth,
      gender: values.gender as Gender,
      maritalStatus: values.maritalStatus as MaritalStatus,
      nationality: values.nationality,
    });
  });

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
      <Card style={{ width: '100%', maxWidth: 560 }}>
        <Typography.Title level={4}>{t('wizard.title')}</Typography.Title>
        <Typography.Paragraph type="secondary">{t('wizard.welcome')}</Typography.Paragraph>
        <Steps
          current={step}
          size="small"
          style={{ marginBottom: 20 }}
          items={[{ title: t('wizard.step1') }, { title: t('wizard.step2') }]}
        />

        {step === 0 ? (
          <>
            <RHFText control={f1.control} name="firstName" label={t('fields.firstName')} maxLength={50} />
            <RHFText control={f1.control} name="lastName" label={t('fields.lastName')} maxLength={50} />
            <RHFText control={f1.control} name="email" label={t('fields.email')} type="email" />
            <RHFDate control={f1.control} name="dateOfBirth" label={t('fields.dateOfBirth')} disabledFuture />
            <div style={{ textAlign: 'right' }}>
              <Button type="primary" onClick={() => void next()}>
                {t('wizard.next')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <RHFText
              control={f2.control}
              name="headline"
              label={t('fields.headline')}
              maxLength={50}
              placeholder={t('fields.headlinePlaceholder')}
            />
            <RHFSelect
              control={f2.control}
              name="gender"
              label={t('fields.gender')}
              options={dictOptions(GENDERS, t)}
            />
            <RHFSelect
              control={f2.control}
              name="maritalStatus"
              label={t('fields.maritalStatus')}
              options={dictOptions(MARITAL_STATUSES, t)}
            />
            <RHFAutoComplete
              control={f2.control}
              name="nationality"
              label={t('fields.nationality')}
              options={nationality.options}
            />
            <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setStep(0)}>{t('wizard.back')}</Button>
              <Button type="primary" onClick={() => void finish()}>
                {t('wizard.finish')}
              </Button>
            </Space>
          </>
        )}
      </Card>
    </div>
  );
}
