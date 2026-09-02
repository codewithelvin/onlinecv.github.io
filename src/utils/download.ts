import type { Resume } from '../types/resume';

/**
 * Handing a generated file to the browser.
 *
 * Lives here rather than in `services/pdf.ts`, where it started, because it now
 * has two callers and the other one must NOT drag the PDF engine in with it: the
 * JSON backup (`features/backup`) is a few hundred bytes of code that would
 * otherwise have to import a module whose whole job is to keep `@react-pdf` out
 * of the main bundle (§19). Nothing here is PDF-specific.
 */

/** How long the blob URL is kept alive after the click (see below). */
const REVOKE_DELAY_MS = 10_000;

/** Save `blob` to the user's downloads as `filename`. */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  /**
   * NOT revoked synchronously after `click()`.
   *
   * Chromium copies the blob before returning from the click, so revoking right
   * away is harmless there. Firefox starts the download asynchronously and reads
   * the blob URL afterwards — revoking in the same tick races that read and the
   * download fails or saves an empty file. Deferring costs a few hundred KB of
   * memory for a few seconds and makes the two engines behave the same.
   */
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

/**
 * The user's name, reduced to what a filename may hold.
 *
 * `\p{L}` and `\p{N}`, not `[A-Za-z0-9]`: the name is the user's own, and every
 * shipped language writes it in its own script — `Hüseynov`, `Иванов`, `김민준`,
 * `山田` all survive, where an ASCII-only filter would leave a Korean user with a
 * file called `_CV.pdf`. What is stripped is the set that breaks a path
 * (`/ \ : * ? " < > |`) plus whitespace, which is exactly what falls outside
 * those two categories anyway.
 */
export function resumeSlug(resume: Resume): string {
  const name = `${resume.basics.firstName}_${resume.basics.lastName}`
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .replace(/^_+|_+$/g, '');
  return name || 'resume';
}
