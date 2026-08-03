import * as yup from 'yup';
import { E164_PHONE, PERSON_NAME, PROFILE_URL } from '../../utils/patterns';
import { calcAge } from '../../utils/date';

/**
 * yup validation schemas (spec §16). Error messages are BARE i18n keys resolved
 * by the form fields under the `validation.*` namespace (§16), so validation
 * localizes automatically. `.when`/`.test` implement the conditional rules.
 */

const PHONE_TYPES = ['mobile', 'landline', 'fax', 'whatsapp'];

const endAfterStart = (
  value: string | undefined,
  ctx: yup.TestContext<{ startDate?: string; current?: boolean }>,
): boolean => {
  const { startDate, current } = ctx.parent as { startDate?: string; current?: boolean };
  if (!value || current || !startDate) return true;
  return value >= startDate;
};

export const contactSchema = yup.object({
  type: yup.string().required('contactTypeRequired'),
  value: yup
    .string()
    .trim()
    .required('valueRequired')
    .when('type', {
      is: (v: string) => PHONE_TYPES.includes(v),
      then: (s) => s.matches(E164_PHONE, 'shouldMatchPhone'),
    })
    .when('type', { is: 'email', then: (s) => s.email('enterValidEmail') })
    .when('type', {
      is: 'website',
      then: (s) => s.url('shouldBeValidUrl').max(100, 'maximumHundredCharacter'),
    })
    .when('type', {
      is: 'linkedin',
      then: (s) => s.matches(PROFILE_URL.linkedin, 'shouldBeLinkedinUrl').max(100, 'maximumHundredCharacter'),
    })
    .when('type', {
      is: 'facebook',
      then: (s) => s.matches(PROFILE_URL.facebook, 'shouldBeFacebookUrl').max(100, 'maximumHundredCharacter'),
    })
    .when('type', {
      is: 'github',
      then: (s) => s.matches(PROFILE_URL.github, 'shouldBeGithubUrl').max(100, 'maximumHundredCharacter'),
    })
    .when('type', {
      is: 'instagram',
      then: (s) => s.matches(PROFILE_URL.instagram, 'shouldBeInstagramUrl').max(100, 'maximumHundredCharacter'),
    })
    .when('type', {
      is: 'x',
      then: (s) => s.matches(PROFILE_URL.x, 'shouldBeXUrl').max(100, 'maximumHundredCharacter'),
    })
    .when('type', { is: 'address', then: (s) => s.max(120, 'addressMax') }),
});

export const experienceSchema = yup.object({
  position: yup.string().trim().required('positionRequired').max(50, 'maximumFiftyCharacter'),
  company: yup.string().trim().required('companyRequired'),
  employmentType: yup.string().optional(),
  location: yup.string().trim().max(100, 'maximumHundredCharacter').optional(),
  startDate: yup.string().required('workedFromRequired'),
  endDate: yup.string().optional().test('after-start', 'endDateAfterStart', endAfterStart),
  current: yup.boolean().default(false),
  description: yup.string().trim().max(600, 'maximumSixHundredCharacter').optional(),
  highlights: yup.array(yup.string().max(200, 'highlightMax')).optional(),
  /** Resolved from the typed title/city on submit — never user input. */
  positionCode: yup.string().optional(),
  locationCode: yup.string().optional(),
});

export const educationSchema = yup.object({
  type: yup.string().required(),
  /**
   * 150, not the source app's 100: seven rows of the `colleges` dictionary are
   * longer than 100 characters once translated (the Russian names run to 118), so
   * a user could pick a college from the dropdown and then be told the value was
   * too long. A field has to be able to hold what its own dictionary offers —
   * asserted in `data/datasets.test.ts`.
   */
  institution: yup.string().trim().required('institutionRequired').max(150, 'maximumHundredCharacter'),
  /**
   * Faculty is ALWAYS optional — a deliberate departure from the source app's
   * yup, which required it for a university. Plenty of diplomas simply do not
   * name a faculty, and requiring it forced those users to invent one. The
   * speciality stays mandatory for college/university (that one is always on the
   * diploma).
   */
  faculty: yup.string().trim().max(100, 'maximumHundredCharacter').optional(),
  specialization: yup
    .string()
    .trim()
    .max(100, 'maximumHundredCharacter')
    .optional()
    .when('type', {
      is: (v: string) => v === 'college' || v === 'university',
      then: (s) => s.required('specializationRequired'),
    }),
  degree: yup
    .string()
    .optional()
    .when('type', { is: 'university', then: (s) => s.required('degreeRequired') }),
  startDate: yup.string().required('startDateRequired'),
  endDate: yup.string().optional().test('after-start', 'endDateAfterStart', endAfterStart),
  current: yup.boolean().default(false),
  comment: yup.string().trim().max(50, 'maximumFiftyCharacter').optional(),
  /** Dictionary codes resolved from the typed text on submit — never user input. */
  code: yup.string().optional(),
  facultyCode: yup.string().optional(),
  specializationCode: yup.string().optional(),
});

export const skillSchema = yup.object({
  name: yup.string().trim().required('skillRequired').max(100, 'maximumHundredCharacter'),
  level: yup
    .number()
    .typeError('skillLevelRange')
    .integer('skillLevelRange')
    .min(1, 'skillLevelRange')
    .max(100, 'skillLevelRange')
    .required('skillLevelRange'),
  code: yup.string().optional(),
});

export const languageSchema = yup.object({
  code: yup.string().required('selectLanguage'),
  level: yup.string().required('selectLanguageLevel'),
});

export const certificationSchema = yup.object({
  name: yup.string().trim().required('certificateNameRequired').max(100, 'maximumHundredCharacter'),
  organization: yup.string().trim().required('organizationRequired'),
  issueDate: yup.string().required('issueDateRequired'),
  expirationDate: yup
    .string()
    .optional()
    .test('after-issue', 'expirationAfterIssue', (value, ctx) => {
      const { issueDate } = ctx.parent as { issueDate?: string };
      if (!value || !issueDate) return true;
      return value >= issueDate;
    }),
  credentialId: yup.string().trim().max(100, 'maximumHundredCharacter').optional(),
  credentialUrl: yup.string().trim().url('credentialUrlInvalid').max(200, 'credentialUrlInvalid').optional(),
  comment: yup.string().trim().max(100, 'maximumHundredCharacter').optional(),
});

export const interestSchema = yup.object({
  name: yup.string().trim().required('interestRequired').max(50, 'maximumFiftyCharacter'),
  code: yup.string().optional(),
});

export const projectSchema = yup.object({
  name: yup.string().trim().required('projectNameRequired').max(100, 'maximumHundredCharacter'),
  description: yup.string().trim().max(600, 'maximumSixHundredCharacter').optional(),
  url: yup.string().trim().url('projectUrlInvalid').max(200, 'projectUrlInvalid').optional(),
  highlights: yup.array(yup.string().max(200, 'highlightMax')).optional(),
});

const nameRule = (requiredKey: string) =>
  yup
    .string()
    .trim()
    .matches(PERSON_NAME, 'onlyLettersAndSpace')
    .min(3, 'minThreeChars')
    .max(50, 'maximumFiftyCharacter')
    .required(requiredKey);

export const wizardStep1Schema = yup.object({
  firstName: nameRule('userFirstnameRequired'),
  lastName: nameRule('userLastnameRequired'),
  email: yup.string().trim().email('enterValidEmail').required('enterValidEmail'),
  dateOfBirth: yup
    .string()
    .required('dobRequired')
    .test('age-range', 'dobRange', (value) => {
      if (!value) return false;
      const age = calcAge(value);
      return age !== null && age >= 16 && age <= 100;
    }),
});

export const wizardStep2Schema = yup.object({
  headline: yup.string().trim().required('cvTitleRequired').max(50, 'maximumFiftyCharacter'),
  gender: yup.string().required('genderRequired'),
  maritalStatus: yup.string().required('maritalRequired'),
  nationality: yup.string().trim().required('nationalityRequired'),
});

export type ContactFormValues = yup.InferType<typeof contactSchema>;
export type ExperienceFormValues = yup.InferType<typeof experienceSchema>;
export type EducationFormValues = yup.InferType<typeof educationSchema>;
export type SkillFormValues = yup.InferType<typeof skillSchema>;
export type LanguageFormValues = yup.InferType<typeof languageSchema>;
export type CertificationFormValues = yup.InferType<typeof certificationSchema>;
export type InterestFormValues = yup.InferType<typeof interestSchema>;
export type ProjectFormValues = yup.InferType<typeof projectSchema>;
export type WizardStep1Values = yup.InferType<typeof wizardStep1Schema>;
export type WizardStep2Values = yup.InferType<typeof wizardStep2Schema>;
