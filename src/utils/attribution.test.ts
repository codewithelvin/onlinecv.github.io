import { describe, expect, it } from 'vitest';
import { showAttribution } from './attribution';
import { createEmptyResume } from './empty-resume';

describe('showAttribution', () => {
  it('is on for a new resume', () => {
    expect(showAttribution(createEmptyResume())).toBe(true);
  });

  it('is on when the resume predates the flag', () => {
    const resume = createEmptyResume();
    delete resume.attribution;
    expect(showAttribution(resume)).toBe(true);
  });

  it('is off only when explicitly disabled', () => {
    expect(showAttribution({ ...createEmptyResume(), attribution: false })).toBe(false);
  });
});
