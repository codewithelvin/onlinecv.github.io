import type { Resume } from '../types/resume';

/** The default template id shipped as the ATS-safe default (§7.1). */
export const DEFAULT_TEMPLATE_ID = 'classic';

/**
 * Build an empty resume (BR-1: single resume under id `default`; BR-8: reset
 * target). `generalInfo` enum fields carry placeholder defaults that the
 * mandatory first-run wizard overwrites before the CV is meaningful.
 */
export function createEmptyResume(locale: Resume['locale'] = 'az'): Resume {
  return {
    id: 'default',
    updatedAt: new Date().toISOString(),
    locale,
    templateId: DEFAULT_TEMPLATE_ID,
    media: {},
    basics: { firstName: '', lastName: '', headline: '', location: '' },
    generalInfo: {
      gender: 'male',
      maritalStatus: 'single',
      nationality: '',
      dateOfBirth: '',
      militaryStatus: undefined,
      driverLicense: [],
    },
    contact: { email: '', items: [] },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    languages: [],
    certifications: [],
    interests: [],
    projects: [],
  };
}

/**
 * Whether the resume still needs the first-run wizard (FR-13): no identity yet.
 */
export function needsWizard(resume: Resume): boolean {
  return !resume.basics.firstName.trim() || !resume.contact.email.trim();
}

/** Minimum required fields for PDF export are valid (BR-4). */
export function canExport(resume: Resume): boolean {
  const { firstName, lastName } = resume.basics;
  const email = resume.contact.email;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return firstName.trim().length > 0 && lastName.trim().length > 0 && emailOk;
}
