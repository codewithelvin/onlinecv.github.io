import { describe, expect, it } from 'vitest';
import { canExport, createEmptyResume, needsWizard } from './empty-resume';

describe('empty-resume', () => {
  it('creates a single-resume default with the ATS template', () => {
    const r = createEmptyResume('az');
    expect(r.id).toBe('default');
    expect(r.templateId).toBe('classic');
    expect(r.locale).toBe('az');
    expect(r.experience).toEqual([]);
  });

  it('needsWizard until identity + email are present', () => {
    const r = createEmptyResume();
    expect(needsWizard(r)).toBe(true);
    r.basics.firstName = 'Elvin';
    r.contact.email = 'elvin@example.az';
    expect(needsWizard(r)).toBe(false);
  });

  it('gates export on first/last name + valid email (BR-4)', () => {
    const r = createEmptyResume();
    expect(canExport(r)).toBe(false);
    r.basics.firstName = 'Elvin';
    r.basics.lastName = 'Huseynov';
    r.contact.email = 'not-an-email';
    expect(canExport(r)).toBe(false);
    r.contact.email = 'elvin@example.az';
    expect(canExport(r)).toBe(true);
  });
});
