import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Resume } from '../../types/resume';
import { renderWithProviders } from '../../test/renderWithProviders';
import { fullResume } from '../../test/fixtures/full-resume';
import { useResumeStore } from '../../state/store';
import { createEmptyResume } from '../../utils/empty-resume';
import { Wizard } from '../wizard/Wizard';
import { BackupButton } from './BackupButton';
import { BACKUP_FORMAT, parseBackup, sanitizeResume, serializeBackup } from './format';

/**
 * The two halves of the feature as the user meets them: the editor's download
 * button and the wizard's file picker.
 *
 * `format.test.ts` owns the file's contents and every hostile input; what is
 * guarded here is the wiring — that the download really produces our envelope,
 * that a picked file lands in the store AND ends the wizard, and that a bad file
 * says so instead of half-loading.
 */

/** What `triggerDownload` handed the browser, captured per test. */
interface Captured {
  filename: string;
  text: () => Promise<string>;
}

let captured: Captured | null = null;
let objectUrls = 0;
let clickSpy: MockInstance | null = null;

beforeEach(() => {
  captured = null;
  objectUrls = 0;
  useResumeStore.setState({
    resume: createEmptyResume('az'),
    uiLocale: 'az',
    openSections: null,
    wizardCompleted: false,
    hydrated: false,
  });

  /**
   * jsdom implements neither blob URLs nor a real download, so the anchor click
   * is intercepted at the two seams that matter: the URL factory (proving the
   * blob was built at all) and the click (proving a filename was set).
   *
   * DEFINED rather than spied on: `URL.createObjectURL` does not exist in jsdom
   * at all, and `vi.spyOn` needs a method to wrap — it fails with
   * "createObjectURL does not exist" before a single assertion runs.
   */
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: (blob: Blob) => {
      objectUrls += 1;
      // `Blob.text()` itself is polyfilled over FileReader in `test/setup.ts`.
      captured = { filename: '', text: () => blob.text() };
      return 'blob:captured';
    },
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: () => undefined,
  });
  clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    if (captured) captured.filename = this.download;
  });
});

afterEach(() => {
  /**
   * ⚠️ NOT `vi.restoreAllMocks()`. `src/test/setup.ts` installs `matchMedia` as
   * a `vi.fn()`, and restoring every mock resets that one too — it then returns
   * `undefined`, and antd's responsive observer dies destructuring `matches` in
   * the NEXT test, which renders as a failure with nothing to do with this file.
   * Only what this file installed is removed.
   */
  clickSpy?.mockRestore();
  clickSpy = null;
  delete (URL as unknown as Record<string, unknown>).createObjectURL;
  delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
});

function seedEditableResume(): Resume {
  const resume = fullResume();
  useResumeStore.setState({ resume, wizardCompleted: true, hydrated: true });
  return resume;
}

/** A `File` the way rc-upload hands one over. */
function backupFile(text: string, name = 'Elvin_CV_2026-09-02.json'): File {
  return new File([text], name, { type: 'application/json' });
}

/** Hand the wizard's hidden `<input type="file">` a file, as a real drop would. */
async function pick(file: File): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('#backup-file');
  if (!input) throw new Error('the wizard has no file input');
  // `userEvent.upload` refuses a hidden input; rc-upload's is `display: none`.
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
  await waitFor(() => expect(document.querySelector('.ant-message-notice')).not.toBeNull());
}

describe('backup download (editor)', () => {
  it('writes our envelope, and the whole resume with it', async () => {
    const resume = seedEditableResume();
    renderWithProviders(<BackupButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Ehtiyat nüsxə' }));

    expect(objectUrls).toBe(1);
    if (!captured) throw new Error('nothing was downloaded');
    const envelope = JSON.parse(await captured.text()) as { format: string; resume: Resume };
    expect(envelope.format).toBe(BACKUP_FORMAT);
    expect(envelope.resume.basics.firstName).toBe(resume.basics.firstName);
    expect(envelope.resume.experience).toHaveLength(resume.experience.length);
  });

  it('names the file after the user and the day, keeping non-Latin letters', async () => {
    const resume = createEmptyResume('az');
    resume.basics.firstName = 'Elvin';
    resume.basics.lastName = 'Hüseynov';
    useResumeStore.setState({ resume, wizardCompleted: true, hydrated: true });
    renderWithProviders(<BackupButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Ehtiyat nüsxə' }));

    if (!captured) throw new Error('nothing was downloaded');
    // The date is what makes a folder of backups readable; the ü is what an
    // ASCII-only slug would have thrown away.
    expect(captured.filename).toMatch(/^Elvin_Hüseynov_CV_\d{4}-\d{2}-\d{2}\.json$/);
  });

  /**
   * The PDF button beside it is gated by BR-4 (name + valid e-mail). This one
   * must NOT be: a backup of a half-finished CV is exactly what someone needs
   * before closing a browser they may not come back to.
   */
  it('is available on an empty resume, unlike the PDF export', async () => {
    renderWithProviders(<BackupButton />);
    const button = screen.getByRole('button', { name: 'Ehtiyat nüsxə' });
    expect(button).not.toBeDisabled();

    await userEvent.click(button);
    expect(objectUrls).toBe(1);
  });

  /**
   * The phone renders it full-width at the foot of the Edit tab rather than in
   * the sticky action bar — a fourth control there wraps the bar to two rows at
   * every phone width (measured, 60 → 103 px). Full width, and so the FULL
   * label: there is no narrow variant of this button any more.
   */
  it('goes full-width for the phone, keeping its whole label', () => {
    renderWithProviders(<BackupButton block />);
    const button = screen.getByRole('button', { name: 'Ehtiyat nüsxə' });
    expect(button).toHaveTextContent('Ehtiyat nüsxə');
    expect(button.className).toContain('ant-btn-block');
  });
});

describe('backup restore (wizard)', () => {
  it('is offered on the first step, next to the fields it replaces', () => {
    renderWithProviders(<Wizard />);
    expect(screen.getByRole('button', { name: 'Fayldan bərpa et' })).toBeInTheDocument();
    expect(document.querySelector('#backup-file')).not.toBeNull();
    // The typing path is untouched — no chooser was put in front of it.
    expect(document.querySelector('#wizard-firstName')).not.toBeNull();
  });

  it('restores a CV from a file and leaves the wizard', async () => {
    const source = fullResume();
    renderWithProviders(<Wizard />);

    await pick(backupFile(serializeBackup(source)));

    const state = useResumeStore.getState();
    expect(state.resume.basics.firstName).toBe(source.basics.firstName);
    expect(state.resume.experience).toHaveLength(source.experience.length);
    expect(state.resume.skills).toHaveLength(source.skills.length);
    // Without this the user would be staring at an empty first-run form with
    // their whole CV sitting behind it.
    expect(state.wizardCompleted).toBe(true);
    expect(await screen.findByText('CV bərpa edildi.')).toBeInTheDocument();
  });

  it('leaves the UI language alone — the file does not carry one', async () => {
    useResumeStore.setState({ uiLocale: 'fr' });
    const source = fullResume();
    source.locale = 'ru';
    renderWithProviders(<Wizard />);

    await pick(backupFile(serializeBackup(source)));

    const state = useResumeStore.getState();
    // The CV's own language is restored; the language the app is being read in
    // is not something a restore may change under the reader.
    expect(state.resume.locale).toBe('ru');
    expect(state.uiLocale).toBe('fr');
  });

  it('refuses a file that is not a backup, and stays in the wizard', async () => {
    renderWithProviders(<Wizard />);

    await pick(backupFile('{"name":"Elvin"}', 'contacts.json'));

    expect(await screen.findByText('Bu fayl OnlineCV ehtiyat nüsxəsi deyil.')).toBeInTheDocument();
    const state = useResumeStore.getState();
    expect(state.wizardCompleted).toBe(false);
    expect(state.resume.basics.firstName).toBe('');
  });

  it('refuses text that is not JSON at all', async () => {
    renderWithProviders(<Wizard />);
    await pick(backupFile('%PDF-1.7 not json', 'cv.pdf'));
    expect(await screen.findByText('Faylın məzmunu oxunmadı.')).toBeInTheDocument();
    expect(useResumeStore.getState().wizardCompleted).toBe(false);
  });

  it('says how much of a damaged file could not be read', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderWithProviders(<Wizard />);

    // Two unreadable levels and an unknown channel: restorable, but not whole.
    await pick(
      backupFile(
        JSON.stringify({
          format: BACKUP_FORMAT,
          version: 1,
          resume: {
            ...createEmptyResume(),
            basics: { firstName: 'Elvin', lastName: 'Huseynov', headline: 'Dev' },
            skills: [{ id: 's', name: 'React', level: 'expert' }],
            languages: [{ id: 'l', name: 'Azerbaijani', level: 'mother tongue' }],
            contact: { email: 'e@x.az', items: [{ id: 'c', type: 'myspace', value: 'x' }] },
          },
        }),
      ),
    );

    // Loaded — an incomplete restore still beats retyping a CV from memory.
    expect(useResumeStore.getState().wizardCompleted).toBe(true);
    expect(useResumeStore.getState().resume.basics.firstName).toBe('Elvin');
    // …but the user is told, with a count, and the paths go to the console.
    expect(await screen.findByText(/Oxunmayan sahələr: 3/)).toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith(
      'Backup restored with omissions',
      expect.arrayContaining(['contact.items[0]', 'skills[0].level', 'languages[0].level']),
    );
  });

  it('refuses a file too large to be one of ours before reading it', async () => {
    renderWithProviders(<Wizard />);
    const huge = backupFile('{}', 'huge.json');
    Object.defineProperty(huge, 'size', { value: 64 * 1024 * 1024 });
    // Would throw if the guard read it — the stub proves the read never happens.
    Object.defineProperty(huge, 'text', {
      value: () => Promise.reject(new Error('the file was read despite its size')),
    });

    await pick(huge);

    expect(await screen.findByText('Fayl çox böyükdür.')).toBeInTheDocument();
    expect(useResumeStore.getState().wizardCompleted).toBe(false);
  });
});

describe('backup round trip through the app', () => {
  /**
   * The whole feature in one pass: fill a CV in, download it, and read the
   * downloaded bytes back into a fresh browser's store. This is the case the
   * user asked for — "later, select the exported file and it builds the resume
   * back again" — and it is the one no unit test covers, because it crosses the
   * download boundary.
   */
  it('rebuilds the CV in a fresh browser from the downloaded bytes', async () => {
    // Seeded already-normalized, so the comparison below is exact: the fixture
    // is hand-written JSON and carries a few `highlights: []` that the sanitizer
    // collapses to absent (an empty optional and no value are the same thing to
    // every template — BR-5). Normalizing on the way in makes the assertion
    // about the FILE rather than about the fixture's punctuation.
    const source = sanitizeResume(seedEditableResume());
    useResumeStore.setState({ resume: source });
    renderWithProviders(<BackupButton />);
    await userEvent.click(screen.getByRole('button', { name: 'Ehtiyat nüsxə' }));
    if (!captured) throw new Error('nothing was downloaded');
    const bytes = await captured.text();

    // A different browser: nothing stored, wizard not done.
    useResumeStore.setState({
      resume: createEmptyResume('az'),
      wizardCompleted: false,
      hydrated: true,
    });

    const result = parseBackup(bytes);
    if (!result.ok) throw new Error(`the app refused its own file: ${result.error}`);
    useResumeStore.getState().importResume(result.resume);

    const restored = useResumeStore.getState().resume;
    expect(restored.basics).toEqual(source.basics);
    expect(restored.contact.items).toEqual(source.contact.items);
    expect(restored.experience).toEqual(source.experience);
    expect(restored.education).toEqual(source.education);
    expect(restored.skills).toEqual(source.skills);
    expect(restored.languages).toEqual(source.languages);
    expect(restored.certifications).toEqual(source.certifications);
    expect(restored.templateId).toBe(source.templateId);
    expect(restored.locale).toBe(source.locale);
    expect(useResumeStore.getState().wizardCompleted).toBe(true);
  });
});
