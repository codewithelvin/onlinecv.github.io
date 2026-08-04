import { describe, expect, it } from 'vitest';
import type { AnyObjectSchema, ValidationError } from 'yup';
import { contactSchema, experienceSchema, wizardStep1Schema, wizardStep2Schema } from './schemas';

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

  /**
   * A Korean surname is ONE syllable — 김, 이, 박 — and 이 alone belongs to about a
   * fifth of the country. The wizard's name rule carried `.min(3)`, inherited from
   * the source app whose users all wrote Azerbaijani names, so shipping the Korean
   * locale would have shipped a first field a Korean user could not get past. Two
   * letters ("Bo", "Li") were already refused for the same reason.
   *
   * `.required()` is what actually guards this field; a name cannot be shorter than
   * one letter. `BasicsSection.test` covers the editor's copy of the rule.
   */
  it('accepts a one-syllable surname and a two-letter given name', async () => {
    for (const [firstName, lastName] of [
      ['민준', '김'],
      ['Bo', 'Li'],
    ]) {
      expect(
        await messagesOf(wizardStep1Schema, {
          firstName,
          lastName,
          email: 'test@example.az',
          dateOfBirth: '1990-01-01',
        }),
        `${firstName} ${lastName} was rejected`,
      ).toEqual([]);
    }
  });

  it('still requires a name to be there at all', async () => {
    const msgs = await messagesOf(wizardStep1Schema, {
      firstName: '   ',
      lastName: '',
      email: 'test@example.az',
      dateOfBirth: '1990-01-01',
    });
    expect(msgs).toContain('userFirstnameRequired');
    expect(msgs).toContain('userLastnameRequired');
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

  /**
   * The source app demanded a marital status and a nationality before it would let
   * anyone past the wizard. Neither identifies a candidate, both are personal, and
   * in many markets stating them is discouraged — so the wizard now asks for the
   * CV title and gender only, and the CV omits whatever was left blank (BR-5).
   */
  it('lets the wizard through without a marital status or nationality', async () => {
    expect(
      await messagesOf(wizardStep2Schema, { headline: 'Frontend Developer', gender: 'male' }),
    ).toEqual([]);
    expect(
      await messagesOf(wizardStep2Schema, {
        headline: 'Frontend Developer',
        gender: 'male',
        maritalStatus: '',
        nationality: '',
      }),
    ).toEqual([]);
  });

  it('still requires the CV title and gender', async () => {
    const msgs = await messagesOf(wizardStep2Schema, { headline: '', gender: undefined });
    expect(msgs).toContain('cvTitleRequired');
    expect(msgs).toContain('genderRequired');
  });
});
