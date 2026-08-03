import type { Resume } from '../types/resume';

/** The default template id shipped as the ATS-safe default (§7.1). */
export const DEFAULT_TEMPLATE_ID = 'classic';

/**
 * Build an empty resume (BR-1: single resume under id `default`; BR-8: reset
 * target). Nothing in `generalInfo` is preselected — gender and marital status
 * start empty and are chosen by the user in the mandatory first-run wizard, so
 * a CV never carries a value nobody picked.
 */
export function createEmptyResume(locale: Resume['locale'] = 'az'): Resume {
  return {
    id: 'default',
    updatedAt: new Date().toISOString(),
    locale,
    templateId: DEFAULT_TEMPLATE_ID,
    attribution: true,
    media: {},
    basics: { firstName: '', lastName: '', headline: '', location: '' },
    generalInfo: {
      gender: undefined,
      maritalStatus: undefined,
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
 * Whether a resume looks like it has never been through the first-run wizard
 * (FR-13): no identity yet.
 *
 * NOT the wizard gate — that is `wizardCompleted` on the store. This is only the
 * back-compat heuristic used at hydration for records written before completion
 * was tracked. Gating on it live sent the user back to the wizard the moment
 * they cleared their own name in the editor, losing the whole CV from view.
 */
export function looksUnstarted(resume: Resume): boolean {
  return !resume.basics.firstName.trim() || !resume.contact.email.trim();
}

/** Minimum required fields for PDF export are valid (BR-4). */
export function canExport(resume: Resume): boolean {
  const { firstName, lastName } = resume.basics;
  const email = resume.contact.email;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return firstName.trim().length > 0 && lastName.trim().length > 0 && emailOk;
}
