import { describe, expect, it } from 'vitest';
import type { Resume } from '../../types/resume';
import { fullResume } from '../../test/fixtures/full-resume';
import { createEmptyResume } from '../../utils/empty-resume';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  buildBackup,
  parseBackup,
  sanitizeResume,
  serializeBackup,
} from './format';

/**
 * The backup file, both directions.
 *
 * The round-trip is the headline case, but the ones that matter more are below
 * it: a file on a disk is the only untrusted input this app has, and every
 * defence in `format.ts` exists because the alternative reaches a rendered CV
 * (or an `href`) unchecked.
 */

/** Restore a resume the way the wizard does — through the file's own text. */
function roundTrip(resume: Resume): { resume: Resume; dropped: string[] } {
  const result = parseBackup(serializeBackup(resume));
  if (!result.ok) throw new Error(`refused its own file: ${result.error}`);
  return { resume: result.resume, dropped: result.dropped };
}

/** A file this app never wrote, built field by field for one hostile case. */
function fileWith(resume: unknown): string {
  return JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, resume });
}

describe('backup round trip', () => {
  it('brings a fully-populated CV back unchanged', () => {
    const original = fullResume();
    // Sanitized once first: the fixture is hand-written JSON, and the sanitizer
    // normalizes a few things it cannot have known about (an empty optional
    // becomes absent). Comparing against the normalized form is what makes this
    // a test of the FILE rather than of the fixture's punctuation — and the
    // assertions below check the content itself against the raw fixture.
    const expected = sanitizeResume(original);
    const { resume, dropped } = roundTrip(expected);

    expect(dropped).toEqual([]);
    expect({ ...resume, updatedAt: '' }).toEqual({ ...expected, updatedAt: '' });
  });

  it('keeps every section of a real CV, not just its shape', () => {
    const original = fullResume();
    const { resume, dropped } = roundTrip(original);

    // Nothing in a file this app produced is unreadable by it.
    expect(dropped).toEqual([]);
    expect(resume.basics.firstName).toBe(original.basics.firstName);
    expect(resume.basics.lastName).toBe(original.basics.lastName);
    expect(resume.contact.email).toBe(original.contact.email);
    expect(resume.summary).toBe(original.summary);
    expect(resume.experience).toHaveLength(original.experience.length);
    expect(resume.education).toHaveLength(original.education.length);
    expect(resume.skills).toHaveLength(original.skills.length);
    expect(resume.languages).toHaveLength(original.languages.length);
    expect(resume.contact.items).toHaveLength(original.contact.items.length);
    // The dictionary CODES, not just the labels: the code is the stored truth
    // and is what re-localizes an entry when the CV language changes (§13.1), so
    // a restore that kept only labels would quietly freeze the CV in one
    // language.
    expect(resume.skills.map((s) => s.code)).toEqual(original.skills.map((s) => s.code));
    expect(resume.education.map((e) => e.code)).toEqual(original.education.map((e) => e.code));
    expect(resume.generalInfo.nationality).toBe(original.generalInfo.nationality);
  });

  it('is idempotent — restoring a restored file changes nothing', () => {
    const once = roundTrip(sanitizeResume(fullResume())).resume;
    const twice = roundTrip(once).resume;
    expect({ ...twice, updatedAt: '' }).toEqual({ ...once, updatedAt: '' });
  });

  it('survives an empty resume — a backup taken mid-wizard is still valid', () => {
    const { resume, dropped } = roundTrip(createEmptyResume('ru'));
    expect(dropped).toEqual([]);
    expect(resume.locale).toBe('ru');
    expect(resume.basics.firstName).toBe('');
    expect(resume.experience).toEqual([]);
  });

  it('carries the avatar, which is the one field that is not text', () => {
    const withPhoto = createEmptyResume();
    // A real 1×1 JPEG, so the check is against the shape the cropper produces.
    withPhoto.media.avatar = `data:image/jpeg;base64,${'/9j/4AAQSkZJRg'}==`;
    expect(roundTrip(withPhoto).resume.media.avatar).toBe(withPhoto.media.avatar);
  });

  it('writes an envelope that names the format and the version', () => {
    const envelope = buildBackup(createEmptyResume());
    expect(envelope.format).toBe(BACKUP_FORMAT);
    expect(envelope.version).toBe(BACKUP_VERSION);
    expect(Date.parse(envelope.exportedAt)).not.toBeNaN();
    // Readable by a human who opens the file, which is half the point of it.
    expect(serializeBackup(createEmptyResume())).toContain('\n  "format"');
  });
});

describe('backup refusal', () => {
  it('refuses text that is not JSON', () => {
    expect(parseBackup('this is a PDF, actually')).toEqual({ ok: false, error: 'notJson' });
    expect(parseBackup('')).toEqual({ ok: false, error: 'notJson' });
    // Truncated mid-write, the realistic corruption case.
    expect(parseBackup('{"format":"onlinecv.resume","resume":{"basics"')).toEqual({
      ok: false,
      error: 'notJson',
    });
  });

  it('refuses JSON that is not one of our files', () => {
    expect(parseBackup('{"name":"Elvin","skills":[]}')).toEqual({
      ok: false,
      error: 'notBackup',
    });
    expect(parseBackup('[1,2,3]')).toEqual({ ok: false, error: 'notBackup' });
    expect(parseBackup('null')).toEqual({ ok: false, error: 'notBackup' });
    // Our tag, but nothing under it to restore.
    expect(parseBackup('{"format":"onlinecv.resume","version":1}')).toEqual({
      ok: false,
      error: 'notBackup',
    });
  });

  it('refuses a file from a newer version rather than guessing at it', () => {
    const future = JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION + 1,
      resume: createEmptyResume(),
    });
    expect(parseBackup(future)).toEqual({ ok: false, error: 'tooNew' });
  });

  it('accepts our tag with no version — the tag already identified the file', () => {
    const result = parseBackup(JSON.stringify({ format: BACKUP_FORMAT, resume: fullResume() }));
    expect(result.ok).toBe(true);
  });
});

describe('backup sanitizer', () => {
  it('drops everything the model does not declare', () => {
    const result = parseBackup(
      fileWith({
        ...createEmptyResume(),
        somethingElse: 'nope',
        basics: { firstName: 'Elvin', lastName: 'Huseynov', headline: 'Dev', extra: 'nope' },
      }),
    );
    if (!result.ok) throw new Error('refused a valid file');
    expect(result.resume).not.toHaveProperty('somethingElse');
    expect(result.resume.basics).not.toHaveProperty('extra');
    expect(result.resume.basics.firstName).toBe('Elvin');
  });

  /**
   * Written as TEXT, not as an object literal: `{ __proto__: … }` in JavaScript
   * sets the prototype rather than a key, so the object-literal version would
   * not reproduce the shape a hostile FILE has. `JSON.parse` gives the key an
   * own property, which is only harmless because nothing here ever spreads the
   * parsed input into an output.
   */
  it('cannot be made to pollute a prototype', () => {
    const result = parseBackup(
      '{"format":"onlinecv.resume","version":1,"resume":' +
        '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},' +
        '"basics":{"firstName":"Elvin"}}}',
    );
    if (!result.ok) throw new Error('refused a valid file');
    expect(result.resume.basics.firstName).toBe('Elvin');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect((result.resume as unknown as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(result.resume)).toBe(Object.prototype);
  });

  it('pins the record id and the timestamp, whatever the file claims', () => {
    const before = Date.now();
    const result = parseBackup(
      fileWith({ ...createEmptyResume(), id: 'somebody-elses-key', updatedAt: '1999-01-01' }),
    );
    if (!result.ok) throw new Error('refused a valid file');
    // BR-1: one resume per browser, under one key.
    expect(result.resume.id).toBe('default');
    expect(Date.parse(result.resume.updatedAt)).toBeGreaterThanOrEqual(before);
  });

  it('keeps a javascript: URL out of a template href', () => {
    const result = parseBackup(
      fileWith({
        ...createEmptyResume(),
        projects: [{ id: 'p', name: 'Portfolio', url: 'javascript:alert(1)' }],
        certifications: [
          {
            id: 'c',
            name: 'Cert',
            organization: 'Org',
            issueDate: '2020-01',
            credentialUrl: 'javascript:alert(2)',
          },
        ],
      }),
    );
    if (!result.ok) throw new Error('refused a valid file');
    // Every template writes both of these straight into an `href`, and neither
    // goes through `contactHref`'s `webUrl` on the way.
    expect(result.resume.projects?.[0].url).toBeUndefined();
    expect(result.resume.certifications?.[0].credentialUrl).toBeUndefined();
    expect(result.dropped).toContain('projects[0].url');
    expect(result.dropped).toContain('certifications[0].credentialUrl');
    // The entry itself survives — only its link was refused.
    expect(result.resume.projects?.[0].name).toBe('Portfolio');
  });

  it('gives a bare host a scheme instead of dropping the link', () => {
    const result = parseBackup(
      fileWith({
        ...createEmptyResume(),
        projects: [{ id: 'p', name: 'Site', url: 'elvin.dev/portfolio' }],
      }),
    );
    if (!result.ok) throw new Error('refused a valid file');
    expect(result.resume.projects?.[0].url).toBe('https://elvin.dev/portfolio');
    expect(result.dropped).toEqual([]);
  });

  it('accepts only a base64 image as the avatar', () => {
    const cases = [
      'https://example.com/me.jpg',
      'data:text/html;base64,PHNjcmlwdD4=',
      'javascript:alert(1)',
      'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
    ];
    for (const avatar of cases) {
      const result = parseBackup(fileWith({ ...createEmptyResume(), media: { avatar } }));
      if (!result.ok) throw new Error('refused a valid file');
      expect(result.resume.media.avatar, avatar).toBeUndefined();
      expect(result.dropped).toContain('media.avatar');
    }
  });

  it('refuses an unreadable date rather than inventing one', () => {
    const result = parseBackup(
      fileWith({
        ...createEmptyResume(),
        generalInfo: { nationality: '', dateOfBirth: '15/06/1987' },
        experience: [
          { id: 'e', company: 'ACME', position: 'Dev', startDate: '2020-13-45', current: true },
        ],
        // A month-precision field is allowed to lose a day it never displayed…
        education: [{ id: 'd', type: 'university', institution: 'BSU', startDate: '2005-09-01' }],
      }),
    );
    if (!result.ok) throw new Error('refused a valid file');
    expect(result.resume.generalInfo.dateOfBirth).toBe('');
    expect(result.resume.experience[0].startDate).toBe('');
    expect(result.resume.education[0].startDate).toBe('2005-09');
    expect(result.dropped).toEqual(
      expect.arrayContaining(['generalInfo.dateOfBirth', 'experience[0].startDate']),
    );
    // …so nothing is reported for the education row.
    expect(result.dropped).not.toContain('education[0].startDate');
  });

  it('will not promote a month into a full date', () => {
    const result = parseBackup(
      fileWith({
        ...createEmptyResume(),
        experience: [
          { id: 'e', company: 'ACME', position: 'Dev', startDate: '2020-06', current: true },
        ],
      }),
    );
    if (!result.ok) throw new Error('refused a valid file');
    // `2020-06-01` would print "01.06.2020" on the CV — a day nobody typed.
    expect(result.resume.experience[0].startDate).toBe('');
  });

  it('takes the lowest value when a self-assessment cannot be read', () => {
    const result = parseBackup(
      fileWith({
        ...createEmptyResume(),
        skills: [
          { id: 's1', name: 'React', level: 'expert' },
          { id: 's2', name: 'Vue', level: 140 },
          { id: 's3', name: 'Svelte', level: '80' },
        ],
        languages: [{ id: 'l1', name: 'Klingon', level: 'fluent' }],
      }),
    );
    if (!result.ok) throw new Error('refused a valid file');
    // Never a middle guess: an invented "50%" or "B2" overstates the user.
    expect(result.resume.skills[0].level).toBe(1);
    expect(result.resume.languages[0].level).toBe('A1');
    // Clamped and coerced, not invented — and so not reported.
    expect(result.resume.skills[1].level).toBe(100);
    expect(result.resume.skills[2].level).toBe(80);
    expect(result.dropped).toEqual(
      expect.arrayContaining(['skills[0].level', 'languages[0].level']),
    );
    expect(result.dropped).not.toContain('skills[1].level');
    expect(result.dropped).not.toContain('skills[2].level');
    // The name a dictionary does not carry is still the user's own (§13.1).
    expect(result.resume.languages[0].name).toBe('Klingon');
  });

  it('replaces missing and duplicated item ids', () => {
    const result = parseBackup(
      fileWith({
        ...createEmptyResume(),
        skills: [
          { name: 'React', level: 90 },
          { id: 'same', name: 'Vue', level: 80 },
          { id: 'same', name: 'Svelte', level: 70 },
        ],
      }),
    );
    if (!result.ok) throw new Error('refused a valid file');
    const ids = result.resume.skills.map((s) => s.id);
    // `updateItem`/`removeItem` match on the id, so a shared one would edit and
    // delete two rows at once.
    expect(new Set(ids).size).toBe(3);
    expect(ids.every(Boolean)).toBe(true);
    expect(result.resume.skills.map((s) => s.name)).toEqual(['React', 'Vue', 'Svelte']);
  });

  it('drops a contact channel it cannot name, and keeps a retired one', () => {
    const result = parseBackup(
      fileWith({
        ...createEmptyResume(),
        contact: {
          email: 'elvin@example.az',
          items: [
            { id: 'a', type: 'mobile', value: '+994501234567' },
            { id: 'b', type: 'myspace', value: 'elvin' },
            // Retired from the picker, still in the model — an item saved
            // before it was retired has to load.
            { id: 'c', type: 'skype', value: 'live:elvin' },
          ],
        },
      }),
    );
    if (!result.ok) throw new Error('refused a valid file');
    expect(result.resume.contact.items.map((c) => c.type)).toEqual(['mobile', 'skype']);
    expect(result.dropped).toContain('contact.items[1]');
  });

  it('falls back to a template this build actually has', () => {
    const result = parseBackup(
      fileWith({ ...createEmptyResume(), templateId: 'template-from-the-future' }),
    );
    if (!result.ok) throw new Error('refused a valid file');
    expect(result.resume.templateId).toBe('classic');
    expect(result.dropped).toContain('templateId');
  });

  it('falls back to the default language for a locale it does not ship', () => {
    const result = parseBackup(fileWith({ ...createEmptyResume(), locale: 'sv' }));
    if (!result.ok) throw new Error('refused a valid file');
    expect(result.resume.locale).toBe('az');
    expect(result.dropped).toContain('locale');
  });

  /**
   * A file that simply omits a field lost the user nothing, so it must not be
   * counted. Only a value that WAS there and could not be used is — otherwise
   * the number the user sees measures the file's brevity, not their loss.
   */
  it('counts nothing for fields a minimal file merely omits', () => {
    const result = parseBackup(fileWith({ basics: { firstName: 'Elvin' } }));
    if (!result.ok) throw new Error('refused a valid file');
    expect(result.dropped).toEqual([]);
    expect(result.resume.locale).toBe('az');
    expect(result.resume.templateId).toBe('classic');
  });

  it('keeps the opt-out flags absent when the file has none', () => {
    const result = parseBackup(fileWith({ basics: { firstName: 'Elvin' } }));
    if (!result.ok) throw new Error('refused a valid file');
    // `showAttribution` and `utils/field-visibility` both read "absent" as
    // "everything on", which is what a record written before those features
    // carries — so inventing `false`/`[]` here would change a CV.
    expect(result.resume.attribution).toBeUndefined();
    expect(result.resume.hiddenFields).toBeUndefined();
    expect(result.resume.manualOrder).toBeUndefined();
  });

  it('keeps only the visibility and order flags it recognizes', () => {
    const result = parseBackup(
      fileWith({
        ...createEmptyResume(),
        attribution: false,
        hiddenFields: ['avatar', 'nonsense', 'summary', 'avatar'],
        manualOrder: ['experience', 'skills'],
      }),
    );
    if (!result.ok) throw new Error('refused a valid file');
    expect(result.resume.attribution).toBe(false);
    expect(result.resume.hiddenFields).toEqual(['avatar', 'summary']);
    // `skills` has no date, so it is not a section the dates can order.
    expect(result.resume.manualOrder).toEqual(['experience']);
  });

  it('survives every field being the wrong type', () => {
    const result = parseBackup(
      fileWith({
        locale: 42,
        templateId: [],
        media: 'a photo',
        basics: 'Elvin Huseynov',
        generalInfo: null,
        contact: { email: 12345, items: 'none' },
        summary: { text: 'hello' },
        experience: 'a job',
        education: [null, 'school', ['nested'], { id: 'e', institution: 'BSU' }],
        skills: undefined,
        languages: 0,
      }),
    );
    if (!result.ok) throw new Error('refused a valid file');
    const resume = result.resume;
    expect(resume.basics.firstName).toBe('');
    expect(resume.contact.email).toBe('');
    expect(resume.summary).toBe('');
    expect(resume.experience).toEqual([]);
    expect(resume.skills).toEqual([]);
    // The one real entry among the rubbish still loads.
    expect(resume.education).toHaveLength(1);
    expect(resume.education[0].institution).toBe('BSU');
    expect(result.dropped).toEqual(
      expect.arrayContaining(['education[0]', 'education[1]', 'education[2]']),
    );
  });

  it('strips control characters that would corrupt the PDF text layer', () => {
    const result = parseBackup(
      fileWith({
        ...createEmptyResume(),
        basics: { firstName: 'El\u0001vin', lastName: 'Hüseynov', headline: 'Dev\ufffc' },
        summary: 'Line one\r\nLine two',
      }),
    );
    if (!result.ok) throw new Error('refused a valid file');
    expect(result.resume.basics.firstName).toBe('Elvin');
    expect(result.resume.basics.lastName).toBe('Hüseynov');
    // U+FFFC is how react-pdf marks an inline image — see the contact marks.
    expect(result.resume.basics.headline).toBe('Dev');
    // A multi-line field keeps its line breaks; a single-line one does not.
    expect(result.resume.summary).toBe('Line one\nLine two');
  });

  it('bounds a hostile file instead of rendering it', () => {
    const result = parseBackup(
      fileWith({
        ...createEmptyResume(),
        basics: { firstName: 'A'.repeat(50_000), lastName: 'B', headline: 'C' },
        skills: Array.from({ length: 250 }, (_, i) => ({
          id: `s${i}`,
          name: `Skill ${i}`,
          level: 50,
        })),
      }),
    );
    if (!result.ok) throw new Error('refused a valid file');
    expect(result.resume.basics.firstName.length).toBeLessThanOrEqual(200);
    expect(result.resume.skills).toHaveLength(100);
    // Said out loud rather than silently truncated.
    expect(result.dropped).toContain('skills[100]');
  });
});
