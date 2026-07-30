import type { Resume } from '../../types/resume';
import data from './elvin-resume.json';

/**
 * A REAL, fully-populated CV — the reference profile the spec was derived from
 * (`onlinecv.az/candidate/elvin`), transcribed into the §13 model: every section
 * filled, four jobs, four schools, eight skills, three languages, two
 * certificates, six contact channels.
 *
 * The empty-resume fixtures the other tests use exercise the code paths; this
 * one exercises the LAYOUT — pagination, wrapping, whether anything falls off
 * the page — which is where a template actually fails in front of a user.
 *
 * Test-only: it lives under `src/test/` and is never imported by app code.
 */
export function fullResume(): Resume {
  return structuredClone(data) as Resume;
}
