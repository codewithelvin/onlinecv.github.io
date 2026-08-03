import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { getTemplate } from '../../templates/_core/registry';
import { A4Frame } from './A4Frame';

/**
 * The accent column (`manifest.pageBleed`) is painted by the FRAME, not by the
 * template — see `PageBleed` for why. These assert the preview half of that
 * contract; the exported half is measured in `templates.pdf.test.tsx`, which
 * checks the same rectangle appears once per page at full A4 height.
 */
describe('A4Frame page bleed', () => {
  const bleed = { width: '34%', color: '#1461c7' };

  it('paints nothing when the template declares no bleed', () => {
    const { container } = render(
      <A4Frame pageMargin={{ top: 28, bottom: 28 }}>
        <div>cv</div>
      </A4Frame>,
    );
    const sheet = container.querySelector('[dir="ltr"] > div > div') as HTMLElement;
    expect([...sheet.children].some((el) => (el as HTMLElement).style.backgroundColor)).toBe(false);
  });

  it('hangs the bleed off the sheet, full height, behind the text area', () => {
    const { container } = render(
      <A4Frame pageMargin={{ top: 28, bottom: 28 }} pageBleed={bleed}>
        <div>cv</div>
      </A4Frame>,
    );
    const sheet = container.querySelector('[dir="ltr"] > div > div') as HTMLElement;
    const layer = sheet.firstElementChild as HTMLElement;

    // The SHEET, not the margin-inset text area: the column has to reach the
    // paper edges, which is exactly what escaping `pageMargin` means.
    expect(layer.style.position).toBe('absolute');
    expect(layer.style.top).toBe('0px');
    expect(layer.style.bottom).toBe('0px');
    expect(layer.style.left).toBe('0px');
    expect(layer.style.width).toBe('34%');

    /**
     * FIRST child, and the text area after it — both positioned. A browser paints
     * positioned elements above in-flow ones whatever the source order, so if the
     * text area were left static this layer would cover the sidebar's own text
     * (a bug that reached a user once already).
     */
    const textArea = layer.nextElementSibling as HTMLElement;
    expect(textArea.style.position).toBe('relative');
    expect(textArea.textContent).toBe('cv');
  });

  it('flips to the far edge when the template asks for it', () => {
    const { container } = render(
      <A4Frame pageBleed={{ ...bleed, side: 'right' }}>
        <div>cv</div>
      </A4Frame>,
    );
    const sheet = container.querySelector('[dir="ltr"] > div > div') as HTMLElement;
    const layer = sheet.firstElementChild as HTMLElement;
    expect(layer.style.right).toBe('0px');
    expect(layer.style.left).toBe('');
  });

  /**
   * ⚠️ THE DOUBLE-MIRROR GUARD.
   *
   * CSS reverses a flex `row` on its own when `direction` is rtl. The templates
   * ALSO mirror their rows explicitly (`mirrorRow`), because react-pdf has no
   * `direction` and would otherwise never mirror at all. Setting `direction: rtl`
   * anywhere on the sheet therefore mirrors the preview twice, putting it back in
   * left-to-right while the PDF stays mirrored: the modern template's sidebar
   * stayed on the left while its accent column moved right, and the CV looked
   * broken in Arabic.
   *
   * So the sheet mirrors exactly once, explicitly, in both renderers — and no
   * element inside it may declare a direction.
   */
  it('never sets a CSS direction on the sheet', () => {
    const { container } = render(
      <A4Frame locale="ar" pageMargin={{ top: 28, bottom: 28 }} pageBleed={bleed}>
        <div>محتوى</div>
      </A4Frame>,
    );
    for (const el of container.querySelectorAll<HTMLElement>('*')) {
      expect(el.style.direction, `${el.tagName} declares a direction`).toBe('');
    }
    // Alignment, on the other hand, is inherited identically by react-pdf.
    const sheet = container.querySelector('[dir="ltr"] > div > div') as HTMLElement;
    const textArea = sheet.lastElementChild as HTMLElement;
    expect(textArea.style.textAlign).toBe('right');
  });

  it('leaves alignment alone for a left-to-right CV', () => {
    const { container } = render(
      <A4Frame locale="az">
        <div>cv</div>
      </A4Frame>,
    );
    const sheet = container.querySelector('[dir="ltr"] > div > div') as HTMLElement;
    expect((sheet.firstElementChild as HTMLElement).style.textAlign).toBe('');
  });

  /**
   * The shipped visual template must actually use the mechanism — otherwise this
   * whole file passes while the accent column has quietly disappeared.
   */
  it('is what the modern template declares', () => {
    expect(getTemplate('modern').manifest.pageBleed).toEqual({
      width: '34%',
      color: '#1461c7',
    });
  });
});
