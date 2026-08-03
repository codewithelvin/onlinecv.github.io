import { type JSX, useState } from 'react';
import { Button, Card, Col, Row, Space, Steps, Typography } from 'antd';
import { SiClaude } from 'react-icons/si';
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
  VerticalFields,
} from '../../components/form/fields';
import { useDictionary } from '../../hooks/useDictionary';
import { dobPickerStart } from '../../utils/date';
import {
  type WizardStep1Values,
  type WizardStep2Values,
  wizardStep1Schema,
  wizardStep2Schema,
} from '../editor/schemas';
import { GENDERS, MARITAL_STATUSES, dictOptions } from '../editor/enums';

/** Two-up on tablet and desktop, stacked on phones (spec §10.3). */
const HALF = { xs: 24, sm: 12 } as const;

/**
 * Build credit in the wizard's card footer.
 *
 * The prefix is translated (`wizard.createdBy`) because it is ordinary prose, but
 * "Claude AI" is NOT — a product name reads the same in every locale, the same
 * call as `ATTRIBUTION_TEXT` on the CV itself. So the line is deliberately split:
 * one translated fragment, one fixed one.
 *
 * The icon sits immediately before the name it belongs to, which is also why it
 * is `aria-hidden`: the name follows it in the text, so announcing the icon would
 * repeat the brand. Its placement therefore holds in a right-to-left locale too —
 * "before the name" is a reading-order relationship, and the browser resolves it.
 */
function BuiltWithClaude({ label }: { label: string }): JSX.Element {
  return (
    <div
      id="wizard-credit"
      style={{
        marginTop: 20,
        paddingTop: 12,
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontSize: 12,
        // The AA-safe muted grey already pinned in `app/theme.ts`; antd's own
        // quaternary text would be about 3:1 against white.
        color: '#8c8c8c',
      }}
    >
      {label}
      <SiClaude aria-hidden size={14} style={{ color: '#D97757', flexShrink: 0 }} />
      Claude AI
    </div>
  );
}

/** First-run 2-step wizard (spec FR-13/§10.2): identity → profile basics. */
export function Wizard(): JSX.Element {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [step1, setStep1] = useState<WizardStep1Values | null>(null);

  const updateBasics = useResumeStore((s) => s.updateBasics);
  const updateGeneralInfo = useResumeStore((s) => s.updateGeneralInfo);
  const updateContactEmail = useResumeStore((s) => s.updateContactEmail);
  const completeWizard = useResumeStore((s) => s.completeWizard);
  const nationality = useDictionary('nationality');

  const f1 = useForm<WizardStep1Values>({
    resolver: yupResolver<WizardStep1Values>(wizardStep1Schema),
    defaultValues: { firstName: '', lastName: '', email: '', dateOfBirth: '' },
  });
  const f2 = useForm<WizardStep2Values>({
    // Gender and marital status start EMPTY on purpose (they are still required):
    // a preselected "Kişi"/"Subay" silently ends up on the CV of everyone who
    // skims past them, so the user picks both explicitly.
    defaultValues: {
      headline: '',
      gender: undefined,
      maritalStatus: undefined,
      nationality: '',
    },
    resolver: yupResolver<WizardStep2Values>(wizardStep2Schema),
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
      // Store the dictionary code when the value matches a known nationality, so
      // the CV can re-label it per language; free text is kept verbatim.
      nationality: nationality.findByLabel(values.nationality)?.code ?? values.nationality,
    });
    // Last, and explicitly: the editor is reached by finishing the wizard, never
    // by the resume happening to hold a name. Clearing a field later is then a
    // validation error in place instead of a trip back to this screen.
    completeWizard();
  });

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100%',
        padding: 16,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 760 }}>
        <Typography.Title level={4}>{t('wizard.title')}</Typography.Title>
        <Typography.Paragraph type="secondary">{t('wizard.welcome')}</Typography.Paragraph>
        <Steps
          current={step}
          size="small"
          style={{ marginBottom: 20 }}
          items={[{ title: t('wizard.step1') }, { title: t('wizard.step2') }]}
        />

        {/* `scope` gives the wizard's controls stable ids (`#wizard-firstName`)
            that never collide with the editor's own `firstName` field. */}
        <VerticalFields scope="wizard">
          {step === 0 ? (
            <>
              <Row gutter={16}>
                <Col {...HALF}>
                  <RHFText
                    control={f1.control}
                    name="firstName"
                    label={t('fields.firstName')}
                    maxLength={50}
                    required
                  />
                </Col>
                <Col {...HALF}>
                  <RHFText
                    control={f1.control}
                    name="lastName"
                    label={t('fields.lastName')}
                    maxLength={50}
                    required
                  />
                </Col>
              </Row>
              <Row gutter={16}>
                <Col {...HALF}>
                  <RHFText
                    control={f1.control}
                    name="email"
                    label={t('fields.email')}
                    type="email"
                    required
                  />
                </Col>
                <Col {...HALF}>
                  <RHFDate
                    control={f1.control}
                    name="dateOfBirth"
                    label={t('fields.dateOfBirth')}
                    defaultPickerValue={dobPickerStart()}
                    disabledFuture
                    required
                  />
                </Col>
              </Row>
              {/* `end`, not `right`: in a right-to-left locale "next" belongs at
                  the end of the reading direction, i.e. on the left. */}
              <div style={{ textAlign: 'end' }}>
                <Button id="wizard-next" type="primary" onClick={() => void next()}>
                  {t('wizard.next')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Row gutter={16}>
                <Col {...HALF}>
                  <RHFText
                    control={f2.control}
                    name="headline"
                    label={t('fields.headline')}
                    maxLength={50}
                    placeholder={t('fields.headlinePlaceholder')}
                    required
                  />
                </Col>
                <Col {...HALF}>
                  <RHFAutoComplete
                    control={f2.control}
                    name="nationality"
                    label={t('fields.nationality')}
                    options={nationality.options}
                    recognized={Boolean(
                      f2.watch('nationality') && nationality.findByLabel(f2.watch('nationality')),
                    )}
                    required
                  />
                </Col>
              </Row>
              <Row gutter={16}>
                <Col {...HALF}>
                  <RHFSelect
                    control={f2.control}
                    name="gender"
                    label={t('fields.gender')}
                    options={dictOptions(GENDERS, t)}
                    placeholder={t('common.select')}
                    required
                  />
                </Col>
                <Col {...HALF}>
                  <RHFSelect
                    control={f2.control}
                    name="maritalStatus"
                    label={t('fields.maritalStatus')}
                    options={dictOptions(MARITAL_STATUSES, t)}
                    placeholder={t('common.select')}
                    required
                  />
                </Col>
              </Row>
              <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button id="wizard-back" onClick={() => setStep(0)}>
                  {t('wizard.back')}
                </Button>
                <Button id="wizard-finish" type="primary" onClick={() => void finish()}>
                  {t('wizard.finish')}
                </Button>
              </Space>
            </>
          )}
        </VerticalFields>

        <BuiltWithClaude label={t('wizard.createdBy')} />
      </Card>
    </div>
  );
}
