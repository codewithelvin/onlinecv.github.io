import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SUPPORTED_LOCALES } from '../../app/i18n';
import { Flag } from './flags';

/**
 * A flag has to be the REAL flag. These are drawn small and simplified, but
 * simplified is not the same as invented: the things a reader recognizes a flag
 * by — how many bands, how many stars, which emblem, what colours — must be
 * right, and this file pins the ones a test can see.
 *
 * jsdom does no layout and no painting, so what is asserted is the geometry that
 * was authored, not how it looks. The visual pass is a browser screenshot.
 */
describe('Flag', () => {
  const draw = (locale: Parameters<typeof Flag>[0]['locale']): SVGElement => {
    const { container } = render(<Flag locale={locale} />);
    return container.querySelector('svg') as SVGElement;
  };

  it('draws one for every supported locale, hidden from assistive technology', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const svg = draw(locale);
      expect(svg, `no flag for "${locale}"`).toBeTruthy();
      expect(svg.getAttribute('data-flag')).toBe(locale);
      // The endonym and ISO code beside it carry the meaning.
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      // Something is actually painted — not an empty box with a border.
      expect(svg.children.length, `"${locale}" is blank`).toBeGreaterThan(1);
    }
  });

  it('keeps every flag inside its 3:2 viewBox', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(draw(locale).getAttribute('viewBox')).toBe('0 0 24 16');
    }
  });

  /**
   * The count and the nine-row 6-5 arrangement are what identify the canton; a
   * token handful of stars is a different flag. (A five-pointed outline and a dot
   * are the same two pixels at this size — the count is the honest part.)
   */
  it('gives the United States all fifty stars, inside the canton', () => {
    const svg = draw('en');
    const stars = [...svg.querySelectorAll('circle')];
    expect(stars).toHaveLength(50);

    const cantonWidth = 9.6;
    const cantonHeight = (16 / 13) * 7;
    for (const star of stars) {
      const cx = Number(star.getAttribute('cx'));
      const cy = Number(star.getAttribute('cy'));
      expect(cx).toBeGreaterThan(0);
      expect(cx).toBeLessThan(cantonWidth);
      expect(cy).toBeGreaterThan(0);
      expect(cy).toBeLessThan(cantonHeight);
    }
    // 13 stripes: a red field with six white ones drawn over it.
    expect(svg.querySelectorAll('rect[fill="#fff"]')).toHaveLength(6);
  });

  /**
   * Most of the Saudi flag IS writing, so the inscription is real text rather than
   * decorative strokes — anything else would be drawing a flag that does not
   * exist. The sword is the other required element.
   */
  it('writes the actual shahada on the Saudi flag, above a sword', () => {
    const svg = draw('ar');
    const text = svg.querySelector('text');
    expect(text, 'the inscription is missing').toBeTruthy();
    // Real Arabic, not a placeholder: the two clauses of the shahada.
    expect(text?.textContent).toContain('لا إله إلا الله');
    expect(text?.textContent).toContain('محمد رسول الله');
    expect(text?.getAttribute('fill')).toBe('#fff');
    // Squeezed to the flag's width rather than replaced by a shape.
    expect(text?.getAttribute('lengthAdjust')).toBe('spacingAndGlyphs');
    expect(svg.querySelector('polygon'), 'no sword').toBeTruthy();
  });

  it('gives Azerbaijan three bands, a crescent and an eight-pointed star', () => {
    const svg = draw('az');
    const bands = [...svg.querySelectorAll('rect')].filter(
      (r) => Number(r.getAttribute('width')) === 24,
    );
    expect(bands.length).toBeGreaterThanOrEqual(3);
    expect(bands.slice(0, 3).map((r) => r.getAttribute('fill'))).toEqual([
      '#0092BC',
      '#EF3340',
      '#509E2F',
    ]);
    // Crescent = two discs; the star = two squares, one rotated 45°.
    expect(svg.querySelectorAll('circle')).toHaveLength(2);
    expect(
      [...svg.querySelectorAll('rect')].some((r) =>
        r.getAttribute('transform')?.includes('rotate(45'),
      ),
    ).toBe(true);
  });

  it('gives Georgia five crosses', () => {
    const svg = draw('ka');
    const red = [...svg.querySelectorAll('rect')].filter(
      (r) => r.getAttribute('fill') === '#FF0000',
    );
    // The central cross is 2 bars; each of the four Bolnisi crosses is 2 more.
    expect(red).toHaveLength(2 + 4 * 2);
  });

  /**
   * The Taegukgi's four trigrams are 건·곤·감·리 — heaven, earth, water, fire — and
   * which bars are broken is what each one IS, so the count of strokes is the
   * checkable part: 건 is three whole bars, 곤 three split ones (6), 감 is
   * broken-solid-broken (5) and 리 solid-broken-solid (4). They are authored as two
   * paths of nine subpaths each, one per diagonal, plus the two taeguk halves.
   */
  it('gives South Korea a red-and-blue taeguk and four correct trigrams', () => {
    const svg = draw('ko');
    // The stroke is declared once on the group the two paths share.
    const trigrams = [...svg.querySelectorAll('g[stroke="#000"] path')];
    expect(trigrams).toHaveLength(2);
    for (const path of trigrams) {
      // 3 + 6 on one diagonal, 4 + 5 on the other: nine strokes either way.
      const strokes = (path.getAttribute('d') ?? '').match(/[Mm]/g) ?? [];
      expect(strokes).toHaveLength(9);
      // Rotated by the flag's own diagonal, atan(2/3) — one sign each.
      expect(path.getAttribute('transform')).toMatch(/^rotate\(-?33\.69/);
    }

    const filled = [...svg.querySelectorAll('path')].map((p) => p.getAttribute('fill'));
    expect(filled).toContain('#cd2e3a');
    expect(filled).toContain('#0047a0');
  });

  it('gives Russia and Spain their bands, in order', () => {
    const ru = [...draw('ru').querySelectorAll('rect')].filter(
      (r) => Number(r.getAttribute('width')) === 24,
    );
    expect(ru.slice(0, 3).map((r) => r.getAttribute('fill'))).toEqual([
      '#fff',
      '#0039A6',
      '#D52B1E',
    ]);

    const es = [...draw('es').querySelectorAll('rect')];
    expect(es[0].getAttribute('fill')).toBe('#AA151B');
    // The yellow band is the middle half of the flag.
    expect(es[1].getAttribute('fill')).toBe('#F1BF00');
    expect(Number(es[1].getAttribute('height'))).toBe(8);
    expect(Number(es[1].getAttribute('y'))).toBe(4);
  });
});
