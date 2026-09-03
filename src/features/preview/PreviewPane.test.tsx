import { beforeEach, describe, expect, it } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useResumeStore } from '../../state/store';
import { createEmptyResume } from '../../utils/empty-resume';
import { ATTRIBUTION_BOTTOM, ATTRIBUTION_TEXT } from '../../utils/attribution';
import { getTemplate } from '../../templates/_core/registry';
import { PreviewPane } from './PreviewPane';

/**
 * The "support the project" credit line: opt-OUT, rendered by the preview frame
 * rather than by a template, so it appears on every template (present and
 * future) without touching the `TemplateProps` contract.
 */
describe('PreviewPane attribution', () => {
  beforeEach(() => {
    const resume = createEmptyResume('az');
    resume.basics = { firstName: 'Elvin', lastName: 'Huseynov', headline: 'Frontend Developer' };
    resume.contact = { email: 'elvin@example.az', items: [] };
    useResumeStore.setState({ resume, uiLocale: 'az', hydrated: true, persistenceError: false });
  });

  it('shows the credit line and a checked opt-out by default', async () => {
    renderWithProviders(<PreviewPane />);
    const checkbox = screen.getByRole('checkbox', { name: /saytımızın linki/i });
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    expect(await screen.findByText(ATTRIBUTION_TEXT)).toBeTruthy();
  });

  /**
   * It has to sit OUTSIDE the page's flow. In the flow it takes height from the
   * template root, and a template that fills the page — the modern one's accent
   * sidebar — stops short of the bottom edge with a white strip under it. jsdom
   * does no layout, so the guard is on the positioning itself.
   */
  it('overlays the page instead of taking height from the template', async () => {
    renderWithProviders(<PreviewPane />);
    const credit = await screen.findByText(ATTRIBUTION_TEXT);
    expect(credit.style.position).toBe('absolute');
    expect(credit.style.marginTop).toBe('');
    expect((credit.parentElement as HTMLElement).style.position).toBe('relative');
  });

  it('removes it from the CV when the box is unchecked', async () => {
    renderWithProviders(<PreviewPane />);
    await screen.findByText(ATTRIBUTION_TEXT);

    await userEvent.click(screen.getByRole('checkbox', { name: /saytımızın linki/i }));

    expect(useResumeStore.getState().resume.attribution).toBe(false);
    await waitFor(() => expect(screen.queryByText(ATTRIBUTION_TEXT)).toBeNull());
  });

  /**
   * The preview canvas must carry the SAME per-page margin the export puts on
   * react-pdf's `Page` (`manifest.pageMargin`), or the two stop agreeing about
   * where the text area is — and the preview is the only thing the user sees
   * before downloading.
   */
  it('insets the text area, and hangs the credit off the sheet', async () => {
    renderWithProviders(<PreviewPane />);
    const credit = await screen.findByText(ATTRIBUTION_TEXT);
    const margin = getTemplate('classic').manifest.pageMargin;
    expect(margin).toBeDefined();

    // The credit belongs to the SHEET, positioned from the paper edge — the
    // same box react-pdf resolves a `Page` child against. Measuring it from the
    // inset text area instead put it below the bottom of the paper.
    const sheet = credit.parentElement as HTMLElement;
    expect(sheet.style.position).toBe('relative');
    expect(credit.style.bottom).toBe(`${ATTRIBUTION_BOTTOM}px`);

    // The margin lives on the text area as a MARGIN (not padding on the sheet),
    // so absolute offsets inside it mean what they mean in react-pdf.
    const textArea = sheet.firstElementChild as HTMLElement;
    expect(textArea.style.marginTop).toBe(`${margin?.top}px`);
    expect(textArea.style.marginBottom).toBe(`${margin?.bottom}px`);
    expect(textArea.style.position).toBe('relative');
    expect(textArea.style.padding).toBe('');
  });

  /**
   * The preview FRAME opts out of the UI's direction, not just the sheet.
   *
   * Under `<html dir="rtl">` (the Arabic UI) the mirrored preview stopped
   * showing what the export produces — and worse, the page is laid out at its
   * full 595pt width and scaled down from its top-left corner, so in RTL the
   * browser packed that oversized box against the right edge, the transform
   * dragged it further left, and `overflow: hidden` cropped it. Asserting the
   * attribute on the SCALING wrapper (the ancestor that measures and clips), not
   * only on the sheet, is what pins the fix.
   */
  it('keeps the whole preview frame left-to-right whatever the UI direction is', async () => {
    useResumeStore.getState().setUiLocale('ar');
    try {
      renderWithProviders(<PreviewPane />);
      const sheet = (await screen.findByText(ATTRIBUTION_TEXT)).parentElement as HTMLElement;
      expect(document.documentElement.getAttribute('dir')).toBe('rtl');
      expect(sheet.getAttribute('dir')).toBe('ltr');

      // The sheet is scaled inside a sizing box inside the measured wrapper —
      // and it is that outermost box whose direction decides where the
      // unscaled page is placed before the transform runs.
      const frame = sheet.parentElement?.parentElement as HTMLElement;
      expect(frame.style.overflow, 'not the clipping wrapper').toBe('hidden');
      expect(frame.getAttribute('dir')).toBe('ltr');
    } finally {
      // Inside `act`: the pane is still mounted, so this re-renders it.
      act(() => useResumeStore.getState().setUiLocale('az'));
    }
  });

  /** Records written before the flag existed must keep showing the credit. */
  it('treats a resume with no stored flag as opted in', async () => {
    const resume = { ...useResumeStore.getState().resume };
    delete resume.attribution;
    useResumeStore.setState({ resume });

    renderWithProviders(<PreviewPane />);
    expect(await screen.findByText(ATTRIBUTION_TEXT)).toBeTruthy();
  });
});
