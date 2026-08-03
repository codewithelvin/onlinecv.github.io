import { describe, expect, it } from 'vitest';
import universities from '../data/universities.json';
import skills from '../data/skills.json';
import { searchKey } from './search';

const contains = (label: string, input: string): boolean =>
  searchKey(label).includes(searchKey(input));

describe('searchKey', () => {
  /**
   * THE BUG THIS EXISTS FOR. `'İ'.toLowerCase()` is `i` + U+0307 (a combining dot
   * above), so a plain lower-cased substring match could not find any label
   * starting with the Azerbaijani dotted capital — and Azerbaijani is the primary
   * market. 67 rows across the shipped dictionaries contain `İ` or `I`.
   */
  it('finds a label starting with the Azerbaijani dotted capital İ', () => {
    expect('İsgəndəriyyə Universiteti'.toLowerCase().includes('is')).toBe(false); // the old behaviour
    expect(contains('İsgəndəriyyə Universiteti', 'is')).toBe(true);
    expect(contains('İordaniya Universiteti', 'iord')).toBe(true);
  });

  it('ignores case', () => {
    expect(contains('Qahirə Universiteti', 'QAHIR')).toBe(true);
    expect(contains('cairo university', 'Cairo')).toBe(true);
  });

  /** A user on a Latin keyboard has no ə, ğ, ş, ç, ö, ü, ı. */
  it('ignores Azerbaijani diacritics in both directions', () => {
    expect(contains('Şəki Dövlət Regional Kolleci', 'seki')).toBe(true);
    expect(contains('Ümmül-Qura Universiteti', 'ummul')).toBe(true);
    expect(contains('Əlcəzair Universiteti', 'elcezair')).toBe(true);
    expect(contains('Boğaziçi Universiteti', 'bogazici')).toBe(true);
  });

  it('ignores Arabic vowel points', () => {
    // Pointed and unpointed spellings of the same word must match each other.
    expect(contains('مُحَمَّد', 'محمد')).toBe(true);
  });

  it('leaves an empty needle matching everything', () => {
    expect(contains('anything', '')).toBe(true);
  });

  it('does not make unrelated labels match', () => {
    expect(contains('Qahirə Universiteti', 'tehran')).toBe(false);
    expect(contains('جامعة القاهرة', 'tehran')).toBe(false);
  });

  /**
   * Every shipped label must be reachable by typing its own first few letters.
   * This is the property the İ bug broke, asserted across the real data rather
   * than on hand-picked examples.
   */
  it('makes every dictionary label findable by its own prefix', () => {
    const rows = [...universities, ...skills];
    const unreachable: string[] = [];
    for (const row of rows) {
      for (const locale of ['az', 'en', 'ru'] as const) {
        const label = (row as Record<string, string>)[locale];
        if (!label) continue;
        const prefix = [...label].slice(0, 3).join('');
        if (!contains(label, prefix)) unreachable.push(`${row.code}/${locale}: ${label}`);
      }
    }
    expect(unreachable).toEqual([]);
  });
});
