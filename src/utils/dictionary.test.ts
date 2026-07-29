import { describe, expect, it } from 'vitest';
import type { DictionaryEntry } from '../types/dictionary';
import { resolveLabel, toOptions } from './dictionary';

const entries: DictionaryEntry[] = [
  { code: 'english', group: 'languages', az: 'İngilis dili', en: 'English language', ru: 'Английский язык' },
];

describe('dictionary utils', () => {
  it('resolves a known code to its localized label', () => {
    expect(resolveLabel(entries, 'english', 'fallback', 'az')).toBe('İngilis dili');
    expect(resolveLabel(entries, 'english', 'fallback', 'en')).toBe('English language');
  });

  it('falls back to free text for an unknown or missing code', () => {
    expect(resolveLabel(entries, 'unknown', 'Custom', 'az')).toBe('Custom');
    expect(resolveLabel(entries, undefined, 'Custom', 'az')).toBe('Custom');
  });

  it('builds locale-specific options', () => {
    expect(toOptions(entries, 'ru')).toEqual([{ value: 'english', label: 'Английский язык' }]);
  });
});
