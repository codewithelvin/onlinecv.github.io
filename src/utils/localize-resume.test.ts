import { describe, expect, it } from 'vitest';
import type { DictionaryBundle } from '../types/dictionary';
import type { Resume } from '../types/resume';
import { createEmptyResume } from './empty-resume';
import { localizeResume, referencedDictionaryGroups } from './localize-resume';

const dicts: DictionaryBundle = {
  skills: [{ code: 'accounting', group: 'skills', az: 'Mühasibatlıq', en: 'Accounting', ru: 'Бухгалтерия' }],
  languages: [{ code: 'english', group: 'languages', az: 'İngilis dili', en: 'English', ru: 'Английский' }],
  interests: [{ code: 'chess', group: 'interests', az: 'Şahmat', en: 'Chess', ru: 'Шахматы' }],
  nationality: [{ code: 'azerbaijani', group: 'nationality', az: 'Azərbaycanlı', en: 'Azerbijani', ru: 'Азербайджанец/ка' }],
  universities: [{ code: 'bsu', group: 'universities', az: 'Bakı Dövlət Universiteti', en: 'Baku State University', ru: 'Бакинский государственный университет' }],
};

function resume(): Resume {
  const r = createEmptyResume('az');
  r.generalInfo.nationality = 'azerbaijani';
  r.skills = [
    { id: 's1', code: 'accounting', name: 'Mühasibatlıq', level: 80 },
    { id: 's2', name: 'Kubernetes', level: 60 },
  ];
  r.languages = [{ id: 'l1', code: 'english', name: 'İngilis dili', level: 'C1' }];
  r.interests = [{ id: 'i1', code: 'chess', name: 'Şahmat' }];
  r.education = [
    { id: 'e1', type: 'university', code: 'bsu', institution: 'Bakı Dövlət Universiteti', startDate: '2007-09', current: false },
    { id: 'e2', type: 'school', institution: 'Məktəb №1', startDate: '1996-09', current: false },
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

    const ru = localizeResume(resume(), 'ru', dicts);
    expect(ru.skills[0].name).toBe('Бухгалтерия');
    expect(ru.languages[0].name).toBe('Английский');
  });

  it('leaves free-text entries untouched (§13.1 fallback)', () => {
    const en = localizeResume(resume(), 'en', dicts);
    expect(en.skills[1].name).toBe('Kubernetes');
    expect(en.education[1].institution).toBe('Məktəb №1');
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
      'interests',
      'languages',
      'nationality',
      'skills',
      'universities',
    ]);
    expect(referencedDictionaryGroups(createEmptyResume('az'))).toEqual([]);
  });
});
