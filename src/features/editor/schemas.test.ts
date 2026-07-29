import { describe, expect, it } from 'vitest';
import type { AnyObjectSchema, ValidationError } from 'yup';
import { contactSchema, experienceSchema, wizardStep1Schema } from './schemas';

async function messagesOf(schema: AnyObjectSchema, value: unknown): Promise<string[]> {
  try {
    await schema.validate(value, { abortEarly: false });
    return [];
  } catch (e) {
    return (e as ValidationError).inner.map((i) => i.message);
  }
}

describe('validation schemas (§16)', () => {
  it('rejects an end date before the start date', async () => {
    const msgs = await messagesOf(experienceSchema, {
      position: 'Dev',
      company: 'ACME',
      startDate: '2020-01-01',
      endDate: '2019-01-01',
      current: false,
    });
    expect(msgs).toContain('endDateAfterStart');
  });

  it('accepts a valid experience item', async () => {
    const msgs = await messagesOf(experienceSchema, {
      position: 'Dev',
      company: 'ACME',
      startDate: '2019-01-01',
      endDate: '2020-01-01',
      current: false,
    });
    expect(msgs).toEqual([]);
  });

  it('validates a mobile number as E.164', async () => {
    expect(await messagesOf(contactSchema, { type: 'mobile', value: '0501112233' })).toContain(
      'shouldMatchPhone',
    );
    expect(await messagesOf(contactSchema, { type: 'mobile', value: '+994501112233' })).toEqual([]);
  });

  it('enforces the age range in the wizard', async () => {
    const now = new Date();
    const tooYoung = `${now.getFullYear() - 10}-01-01`;
    expect(
      await messagesOf(wizardStep1Schema, {
        firstName: 'Elvin',
        lastName: 'Huseynov',
        email: 'elvin@example.az',
        dateOfBirth: tooYoung,
      }),
    ).toContain('dobRange');
  });
});
