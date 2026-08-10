import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { SkillModal } from '../../features/editor/modals/SkillModal';

/**
 * `RHFSlider` driven through the modal that actually uses it, because the bug it
 * guards against lived in the gap between the two: the control's DISPLAY and the
 * value the form submitted.
 *
 * Reported from production as "user sets the knowledge percentage to 0, the
 * system corrects it to 1, but it does not save it and shows a validation
 * error". Both halves were real — emptying the number box made rc-input-number
 * emit `null`, the field then re-rendered showing `min`, and Save failed the
 * `1..100` rule against a control that plainly read 1.
 */
describe('RHFSlider (skill level)', () => {
  const base = {
    open: true as const,
    title: 'Bacarıq',
    defaultValues: { name: 'React', level: 50, code: undefined },
    onCancel: vi.fn(),
  };

  /** The number box beside the slider — the only handle a keyboard can drive. */
  const levelBox = (): HTMLInputElement => screen.getByRole('spinbutton') as HTMLInputElement;
  const save = (): HTMLElement => screen.getByRole('button', { name: 'Yadda saxla' });

  it('shows nothing while the level box is empty, rather than a value it has not stored', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SkillModal {...base} onSubmit={vi.fn()} />);

    await user.clear(levelBox());

    // The old code substituted `min` for a missing value, so this box read "1"
    // while the form held `null` — and the next keystroke landed after that 1,
    // turning a typed "0" into "10".
    expect(levelBox()).toHaveValue('');
  });

  it('resolves an emptied level to the minimum and SAVES that value', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<SkillModal {...base} onSubmit={onSubmit} />);

    await user.clear(levelBox());
    await user.click(save());

    // What the control shows and what leaves the modal are the same number.
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'React', level: 1 });
    expect(levelBox()).toHaveValue('1');
    expect(document.querySelector('.ant-form-item-explain')).toBeNull();
  });

  it('saves the corrected value when the level is typed below the minimum', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<SkillModal {...base} onSubmit={onSubmit} />);

    await user.clear(levelBox());
    await user.type(levelBox(), '0');
    await user.click(save());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ level: 1 });
  });

  it('keeps an in-range level exactly as typed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<SkillModal {...base} onSubmit={onSubmit} />);

    await user.clear(levelBox());
    await user.type(levelBox(), '80');
    await user.click(save());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ level: 80 });
  });
});
