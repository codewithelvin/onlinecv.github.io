import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { useResumeStore } from '../../../state/store';
import { createEmptyResume } from '../../../utils/empty-resume';
import { VALUE_DIR } from '../../../utils/bidi';
import { ContactSection } from './ContactSection';

/**
 * Contact values are the app's only fields whose direction cannot come from the
 * interface language: one field holds a phone number, a handle, a URL and a
 * street address. Under `<html dir="rtl">` (Arabic, Hebrew) a value starting
 * with a bidi-neutral character is drawn with that character at the far end —
 * `+994501234567` becomes `994501234567+`, so the country code loses its plus.
 *
 * jsdom does no layout and no bidi, so what is asserted here is the contract
 * that fixes it: the control declares a direction of its own rather than
 * inheriting the UI's. See `utils/bidi` for why `auto` is the right one.
 */
describe('ContactSection direction', () => {
  beforeEach(() => {
    const resume = createEmptyResume('az');
    resume.contact.email = 'elvin@example.az';
    resume.contact.items = [
      { id: 'c1', type: 'mobile', value: '+994501234567' },
      { id: 'c2', type: 'telegram', value: '@elvin' },
      { id: 'c3', type: 'address', value: 'Bakı, Azərbaycan' },
    ];
    useResumeStore.setState({ resume, uiLocale: 'az', hydrated: true, persistenceError: false });
  });

  it('lets every saved value own its direction in the read-out', () => {
    renderWithProviders(<ContactSection />);
    for (const value of ['+994501234567', '@elvin', 'Bakı, Azərbaycan']) {
      const node = screen.getByText(value);
      expect(node.getAttribute('dir'), `"${value}" inherits the UI direction`).toBe(VALUE_DIR);
    }
  });

  it('declares a direction on the primary e-mail input', () => {
    const { container } = renderWithProviders(<ContactSection />);
    const input = container.querySelector('input[type="email"]');
    expect(input?.getAttribute('dir')).toBe(VALUE_DIR);
  });

  /**
   * The single value field serves every channel, so the direction must be on it
   * unconditionally — `auto` reads the value itself, which is what keeps a phone
   * number left-to-right and still lets an Arabic address stay right-to-left.
   */
  it('declares a direction on the value field of the add dialog', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactSection />);
    await user.click(screen.getByRole('button', { name: 'Əlavə et' }));
    await waitFor(() => expect(document.querySelector('.ant-modal-content')).toBeTruthy());

    const label = screen.getByText('Dəyər');
    const input = label.closest('.ant-form-item')?.querySelector('input');
    expect(input, 'the value field is not an input').toBeTruthy();
    expect(input?.getAttribute('dir')).toBe(VALUE_DIR);
  });
});
