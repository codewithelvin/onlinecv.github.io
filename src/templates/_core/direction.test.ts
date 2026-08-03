import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES } from '../../app/i18n/locales';
import { bleedSide, isRtl, mirrorRow } from './direction';

/**
 * `react-pdf` never calls Yoga's `setDirection` — it only maps `flexDirection` —
 * so nothing about a right-to-left CV's BLOCK layout happens automatically.
 * These pin the explicit mirroring the templates and core rely on instead.
 */
describe('isRtl', () => {
  it('is true for Arabic and false for every other supported locale', () => {
    expect(isRtl('ar')).toBe(true);
    for (const locale of SUPPORTED_LOCALES.filter((l) => l !== 'ar')) {
      expect(isRtl(locale), locale).toBe(false);
    }
  });
});

describe('mirrorRow', () => {
  const row = { display: 'flex', flexDirection: 'row', justifyContent: 'space-between' } as const;

  it('flips a row for a right-to-left CV', () => {
    expect(mirrorRow(row, 'ar').flexDirection).toBe('row-reverse');
    expect(mirrorRow({ ...row, flexDirection: 'row-reverse' }, 'ar').flexDirection).toBe('row');
  });

  it('leaves left-to-right CVs completely untouched', () => {
    // Identity, not just equality: the templates call this on every render, so a
    // new object each time would defeat any memoization downstream.
    expect(mirrorRow(row, 'az')).toBe(row);
    expect(mirrorRow(row, 'ka')).toBe(row);
  });

  it('is a no-op on anything that is not a row', () => {
    const column = { display: 'flex', flexDirection: 'column' } as const;
    expect(mirrorRow(column, 'ar')).toBe(column);
    expect(mirrorRow({ padding: 4 }, 'ar')).toEqual({ padding: 4 });
  });

  it('keeps every other declaration', () => {
    expect(mirrorRow(row, 'ar').justifyContent).toBe('space-between');
  });
});

describe('bleedSide', () => {
  it('takes the manifest at its word for a left-to-right CV', () => {
    expect(bleedSide({ width: '34%', color: '#000' }, 'az')).toBe('left');
    expect(bleedSide({ width: '34%', color: '#000', side: 'right' }, 'az')).toBe('right');
  });

  /**
   * The manifest states the left-to-right design. For Arabic the template's root
   * row is mirrored, moving the sidebar across, so the accent column has to move
   * with it or it ends up behind the main column.
   */
  it('mirrors for a right-to-left CV so it stays under the sidebar', () => {
    expect(bleedSide({ width: '34%', color: '#000' }, 'ar')).toBe('right');
    expect(bleedSide({ width: '34%', color: '#000', side: 'right' }, 'ar')).toBe('left');
  });
});
