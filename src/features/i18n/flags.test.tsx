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

  /**
   * China's five stars sit on the published 15 × 10 grid of the flag's upper-left
   * quarter, and the checkable parts are the count, the two sizes, and — the detail
   * that is easiest to lose — that each small star is TURNED so one of its points
   * aims at the centre of the big one. An upright small star is the usual mistake.
   */
  it('gives China five yellow stars, the small four aimed at the large one', () => {
    const svg = draw('zh');
    expect(svg.querySelector('rect')?.getAttribute('fill')).toBe('#EE1C25');

    const stars = [...svg.querySelectorAll('polygon')];
    expect(stars).toHaveLength(5);
    for (const star of stars) {
      expect(star.getAttribute('fill')).toBe('#FFFF00');
      // A pentagram is ten vertices: five points and five waist corners.
      expect((star.getAttribute('points') ?? '').split(' ')).toHaveLength(10);
    }

    const vertices = stars.map((s) =>
      (s.getAttribute('points') ?? '')
        .split(' ')
        .map((p) => p.split(',').map(Number) as [number, number]),
    );
    const centre = (pts: [number, number][]): [number, number] => [
      pts.reduce((sum, [x]) => sum + x, 0) / pts.length,
      pts.reduce((sum, [, y]) => sum + y, 0) / pts.length,
    ];
    const radius = (pts: [number, number][]): number => {
      const [cx, cy] = centre(pts);
      return Math.max(...pts.map(([x, y]) => Math.hypot(x - cx, y - cy)));
    };

    // The grid is 30 wide against this box's 24, so the scale is 0.8: the big star's
    // published radius of 3 becomes 2.4 and each small one's 1 becomes 0.8.
    const [big, ...small] = vertices;
    expect(centre(big)[0]).toBeCloseTo(4, 1);
    expect(centre(big)[1]).toBeCloseTo(4, 1);
    expect(radius(big)).toBeCloseTo(2.4, 2);
    expect(small).toHaveLength(4);
    for (const star of small) expect(radius(star)).toBeCloseTo(0.8, 2);

    // Each small star's FIRST vertex is one of its points, and it must lie on the
    // line towards the big star's centre — that is the rule the construction states.
    for (const star of small) {
      const [cx, cy] = centre(star);
      const toBigStar = Math.atan2(4 - cy, 4 - cx);
      const toOwnPoint = Math.atan2(star[0][1] - cy, star[0][0] - cx);
      expect(Math.abs(toBigStar - toOwnPoint)).toBeLessThan(0.02);
    }
  });

  /**
   * Three tricolours whose only failure modes are the order of the bands and
   * whether they run the right way — so that is exactly what is pinned. France and
   * Italy are vertical with the hoist-side colour first; Germany is horizontal,
   * black at the top. Getting France's direction wrong draws the Dutch flag's
   * cousin, and reversing Italy's draws no flag at all.
   */
  it('gives France, Germany and Italy their bands, in order and the right way up', () => {
    const bands = (locale: 'fr' | 'de' | 'it', vertical: boolean): string[] =>
      [...draw(locale).querySelectorAll('rect')]
        // The hairline border is the only stroked rect, and it paints no band.
        .filter((r) => r.getAttribute('fill') !== 'none')
        .filter(
          (r) => Number(r.getAttribute(vertical ? 'height' : 'width')) === (vertical ? 16 : 24),
        )
        .map((r) => r.getAttribute('fill') as string);

    expect(bands('fr', true)).toEqual(['#000091', '#fff', '#E1000F']);
    expect(bands('it', true)).toEqual(['#008C45', '#F4F5F0', '#CD212A']);
    expect(bands('de', false)).toEqual(['#000', '#FF0000', '#FFCC00']);

    // Vertical means each band is a third of the WIDTH, at x = 0, 8, 16.
    for (const locale of ['fr', 'it'] as const) {
      const xs = [...draw(locale).querySelectorAll('rect')]
        .filter((r) => Number(r.getAttribute('height')) === 16)
        .map((r) => Number(r.getAttribute('x') ?? 0));
      expect(xs).toEqual([0, 8, 16]);
    }
  });

  /**
   * Turkey is the one flag here whose published construction fits this box exactly
   * (its official ratio is 2:3), so the legal numbers are assertable as such: the
   * crescent's outer circle is centred at ½G with radius ¼G, its inner circle is
   * offset by 1/16 G with radius ⅕G.
   *
   * The two things an eyeballed Turkish flag gets wrong are both here. The star is
   * ROTATED so one of its points aims at the hoist, straight into the crescent —
   * not upright. And it sits far enough in that its inner point passes the
   * crescent's horn tips, which is derived from the two circles rather than typed,
   * so the relationship holds even if the geometry is ever rescaled.
   */
  it('gives Turkey the legal crescent, and a star turned to face it', () => {
    const svg = draw('tr');
    expect(svg.querySelector('rect')?.getAttribute('fill')).toBe('#E30A17');

    const [outer, inner] = [...svg.querySelectorAll('circle')];
    // G is this box's height, 16. ½G from the hoist, radius ¼G.
    expect(Number(outer.getAttribute('cx'))).toBeCloseTo(8, 6);
    expect(Number(outer.getAttribute('r'))).toBeCloseTo(4, 6);
    expect(outer.getAttribute('fill')).toBe('#fff');
    // Offset towards the fly by 1/16 G = 1, radius ⅕G — and bitten out in red.
    expect(Number(inner.getAttribute('cx'))).toBeCloseTo(9, 6);
    expect(Number(inner.getAttribute('r'))).toBeCloseTo(3.2, 6);
    expect(inner.getAttribute('fill')).toBe('#E30A17');
    for (const circle of [outer, inner]) {
      expect(Number(circle.getAttribute('cy'))).toBe(8);
    }

    const star = svg.querySelector('polygon');
    expect(star?.getAttribute('fill')).toBe('#fff');
    const vertices = (star?.getAttribute('points') ?? '')
      .split(' ')
      .map((p) => p.split(',').map(Number) as [number, number]);
    expect(vertices).toHaveLength(10);

    const cx = vertices.reduce((sum, [x]) => sum + x, 0) / vertices.length;
    const cy = vertices.reduce((sum, [, y]) => sum + y, 0) / vertices.length;
    // Circumscribed diameter ¼G = 4, on the centre line. Precision 3, because the
    // vertices are authored with `toFixed(3)` and the centroid inherits that.
    expect(Math.max(...vertices.map(([x, y]) => Math.hypot(x - cx, y - cy)))).toBeCloseTo(2, 3);
    expect(cy).toBeCloseTo(8, 3);

    // ONE POINT AIMS AT THE HOIST: the first vertex is a point of the star, due
    // left of its centre — not up, which is how this star is usually drawn.
    const [firstX, firstY] = vertices[0];
    expect(firstY).toBeCloseTo(cy, 3);
    expect(firstX).toBeLessThan(cx);

    // And it reaches PAST the crescent's horn tips, i.e. into the opening. The tip
    // is where the two circles meet, derived here rather than hard-coded.
    const hornTipX = (4 ** 2 - 3.2 ** 2 - 8 ** 2 + 9 ** 2) / (2 * (9 - 8));
    expect(hornTipX).toBeCloseTo(11.38, 6);
    expect(firstX).toBeLessThan(hornTipX);
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
