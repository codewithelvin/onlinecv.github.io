import { describe, expect, it } from 'vitest';
import type { DictionaryBundle } from '../types/dictionary';
import type { Resume } from '../types/resume';
import { createEmptyResume } from './empty-resume';
import { localizeResume, referencedDictionaryGroups } from './localize-resume';

const dicts: DictionaryBundle = {
  skills: [
    {
      code: 'accounting',
      group: 'skills',
      az: 'Mühasibatlıq',
      en: 'Accounting',
      ru: 'Бухгалтерия',
    },
  ],
  languages: [
    { code: 'english', group: 'languages', az: 'İngilis dili', en: 'English', ru: 'Английский' },
  ],
  interests: [{ code: 'chess', group: 'interests', az: 'Şahmat', en: 'Chess', ru: 'Шахматы' }],
  nationality: [
    {
      code: 'azerbaijani',
      group: 'nationality',
      az: 'Azərbaycanlı',
      en: 'Azerbijani',
      ru: 'Азербайджанец/ка',
    },
  ],
  universities: [
    {
      code: 'bsu',
      group: 'universities',
      az: 'Bakı Dövlət Universiteti',
      en: 'Baku State University',
      ru: 'Бакинский государственный университет',
    },
  ],
  faculties: [
    { code: 'economics', group: 'faculties', az: 'İqtisadiyyat', en: 'Economics', ru: 'Экономика' },
  ],
  specialities: [
    { code: 'finance', group: 'specialities', az: 'Maliyyə', en: 'Finance', ru: 'Финансы' },
  ],
  positions: [
    { code: 'accountant', group: 'positions', az: 'Mühasib', en: 'Accountant', ru: 'Бухгалтер' },
  ],
  cities: [{ code: 'baku', group: 'cities', az: 'Bakı', en: 'Baku', ru: 'Баку' }],
};

function resume(): Resume {
  const r = createEmptyResume('az');
  r.basics.location = 'Bakı';
  r.basics.locationCode = 'baku';
  r.generalInfo.nationality = 'azerbaijani';
  r.skills = [
    { id: 's1', code: 'accounting', name: 'Mühasibatlıq', level: 80 },
    { id: 's2', name: 'Kubernetes', level: 60 },
  ];
  r.languages = [{ id: 'l1', code: 'english', name: 'İngilis dili', level: 'C1' }];
  r.experience = [
    {
      id: 'w1',
      position: 'Mühasib',
      positionCode: 'accountant',
      company: 'Cybernet',
      location: 'Bakı',
      locationCode: 'baku',
      startDate: '2020-01-01',
      current: true,
    },
    // Free text: a title that is not in the dictionary stays as typed.
    {
      id: 'w2',
      position: 'Baş şüşəsilən',
      company: 'Filankəs MMC',
      startDate: '2015-01-01',
      current: false,
    },
  ];
  r.interests = [{ id: 'i1', code: 'chess', name: 'Şahmat' }];
  r.education = [
    {
      id: 'e1',
      type: 'university',
      code: 'bsu',
      institution: 'Bakı Dövlət Universiteti',
      faculty: 'İqtisadiyyat',
      facultyCode: 'economics',
      specialization: 'Maliyyə',
      specializationCode: 'finance',
      startDate: '2007-09',
      current: false,
    },
    { id: 'e2', type: 'school', institution: 'Məktəb №1', startDate: '1996-09', current: false },
    // A college whose speciality is not in the dictionary: free text, no code.
    {
      id: 'e3',
      type: 'college',
      institution: 'Bakı Kolleci',
      specialization: 'Özüm uydurduğum ixtisas',
      startDate: '2003-09',
      current: false,
    },
  ];
  return r;
}

describe('localizeResume', () => {
  it('re-labels every dictionary-backed value into the target locale', () => {
    const en = localizeResume(resume(), 'en', dicts);
    expect(en.generalInfo.nationality).toBe('Azerbijani');
    expect(en.skills[0].name).toBe('Accounting');
    expect(en.languages[0].name).toBe('English');
    expect(en.interests?.[0].name).toBe('Chess');
    expect(en.education[0].institution).toBe('Baku State University');
    // An education item carries three independent codes; all three must follow.
    expect(en.education[0].faculty).toBe('Economics');
    expect(en.education[0].specialization).toBe('Finance');

    const ru = localizeResume(resume(), 'ru', dicts);
    expect(ru.skills[0].name).toBe('Бухгалтерия');
    expect(ru.languages[0].name).toBe('Английский');
    expect(ru.education[0].faculty).toBe('Экономика');
    expect(ru.education[0].specialization).toBe('Финансы');
    expect(en.experience[0].position).toBe('Accountant');
    expect(ru.experience[0].position).toBe('Бухгалтер');
    // The city is dictionary-backed in two places: basics and each job.
    expect(en.basics.location).toBe('Baku');
    expect(ru.basics.location).toBe('Баку');
    expect(en.experience[0].location).toBe('Baku');
  });

  it('leaves free-text entries untouched (§13.1 fallback)', () => {
    const en = localizeResume(resume(), 'en', dicts);
    expect(en.skills[1].name).toBe('Kubernetes');
    expect(en.education[1].institution).toBe('Məktəb №1');
    expect(en.education[2].specialization).toBe('Özüm uydurduğum ixtisas');
    expect(en.experience[1].position).toBe('Baş şüşəsilən');
  });

  /**
   * Faculty is optional (many diplomas do not name one), so the projection has to
   * leave an absent field absent rather than turning it into an empty string a
   * template would then render as a blank line.
   */
  it('keeps an absent faculty absent', () => {
    const en = localizeResume(resume(), 'en', dicts);
    expect(en.education[2].faculty).toBeUndefined();
    expect(en.education[1].specialization).toBeUndefined();
  });

  it('keeps free-text nationality verbatim', () => {
    const r = resume();
    r.generalInfo.nationality = 'Gruzin';
    expect(localizeResume(r, 'en', dicts).generalInfo.nationality).toBe('Gruzin');
  });

  it('re-localizes a nationality stored as a LABEL by an older build', () => {
    const r = resume();
    r.generalInfo.nationality = 'Azərbaycanlı';
    expect(localizeResume(r, 'ru', dicts).generalInfo.nationality).toBe('Азербайджанец/ка');
  });

  it('falls back to the stored label when the dictionary is not loaded yet', () => {
    const same = localizeResume(resume(), 'en', {});
    expect(same.skills[0].name).toBe('Mühasibatlıq');
  });

  it('is idempotent and identity-stable, so memoized consumers do not re-render', () => {
    const once = localizeResume(resume(), 'az', dicts);
    expect(localizeResume(once, 'az', dicts)).toBe(once);
  });

  it('reports only the dictionaries the resume actually references', () => {
    expect(referencedDictionaryGroups(resume()).sort()).toEqual([
      'cities',
      // The fixture's school and college carry institution TEXT but no code, and
      // that text still has to be looked up — see the migration block below.
      'colleges',
      'faculties',
      'interests',
      'languages',
      'nationality',
      'positions',
      'skills',
      'specialities',
      'universities',
    ]);
    /**
     * A field holding TEXT but no code still needs its dictionary: `resolveLabel`
     * looks the text up as a label, which is what re-localizes a CV written before
     * these fields had code columns. So dropping the codes must not drop the
     * groups — only an EMPTY field does that.
     */
    const freeText = resume();
    freeText.education = freeText.education.map((e) => ({
      ...e,
      code: undefined,
      facultyCode: undefined,
      specializationCode: undefined,
    }));
    expect(referencedDictionaryGroups(freeText)).toContain('faculties');
    expect(referencedDictionaryGroups(freeText)).toContain('specialities');

    // Nothing filled in at all: nothing to load.
    expect(referencedDictionaryGroups(createEmptyResume('az'))).toEqual([]);
    // And a section that exists but is blank does not pull its dictionary in.
    const blank = createEmptyResume('az');
    blank.skills = [{ id: 's1', name: '   ', level: 50 }];
    expect(referencedDictionaryGroups(blank)).toEqual([]);
  });

  /**
   * THE MIGRATION. `cities`, `positions`, `faculties` and `specialities` only
   * gained code columns on 2026-08-03, so every CV written before that holds a good
   * label and no code. Those values used to stay frozen in the language they were
   * typed in while an identical value picked today re-labelled — visibly
   * inconsistent, and the reason this fallback exists.
   */
  describe('values stored before their field had a code column', () => {
    it('re-labels a city, position, faculty and speciality from the label alone', () => {
      const r = resume();
      r.basics = { ...r.basics, location: 'Bakı', locationCode: undefined };
      r.experience = [
        {
          id: 'w1',
          company: 'Cybernet',
          position: 'Mühasib',
          positionCode: undefined,
          location: 'Bakı',
          locationCode: undefined,
          startDate: '2020-01-01',
          current: true,
        },
      ];
      r.education = [
        {
          id: 'e1',
          type: 'university',
          institution: 'Bakı Dövlət Universiteti',
          code: undefined,
          faculty: 'İqtisadiyyat',
          facultyCode: undefined,
          specialization: 'Maliyyə',
          specializationCode: undefined,
          startDate: '2007-09',
          current: false,
        },
      ];
      r.skills = [{ id: 's1', name: 'Mühasibatlıq', level: 80 }];

      const ru = localizeResume(r, 'ru', dicts);
      expect(ru.basics.location).toBe('Баку');
      expect(ru.experience[0].location).toBe('Баку');
      expect(ru.experience[0].position).toBe('Бухгалтер');
      expect(ru.education[0].institution).toBe('Бакинский государственный университет');
      expect(ru.education[0].faculty).toBe('Экономика');
      expect(ru.education[0].specialization).toBe('Финансы');
      expect(ru.skills[0].name).toBe('Бухгалтерия');
    });

    /** Recognizing a label in ANY language, not just the one it is being read in. */
    it('recognizes the label whichever language it was typed in', () => {
      const r = resume();
      r.basics = { ...r.basics, location: 'Баку', locationCode: undefined };
      expect(localizeResume(r, 'en', dicts).basics.location).toBe('Baku');
    });

    /** And genuinely free text is still left alone — §13.1 is not weakened. */
    it('leaves a value that matches no dictionary label untouched', () => {
      const r = resume();
      r.basics = { ...r.basics, location: 'Kəndimiz', locationCode: undefined };
      r.skills = [{ id: 's1', name: 'Kubernetes', level: 60 }];
      const en = localizeResume(r, 'en', dicts);
      expect(en.basics.location).toBe('Kəndimiz');
      expect(en.skills[0].name).toBe('Kubernetes');
    });
  });
});
