import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { HideableField, Resume } from '../types/resume';
import type { RegisteredTemplate } from '../types/template';
import { fullResume } from '../test/fixtures/full-resume';
import { makeDateFormatter } from './date';
import { i18n } from '../app/i18n';
import { listTemplates } from '../templates/_core/registry';
import {
  HIDEABLE_FIELDS,
  applyFieldVisibility,
  isFieldVisible,
  withFieldVisibility,
} from './field-visibility';

/**
 * Per-field visibility for the personal details.
 *
 * What is worth guarding is not the flag but its EFFECT: a field the user turned
 * off has to be absent from the rendered CV, and turning it off must not touch the
 * value in the editor. The last block therefore renders the real templates instead
 * of inspecting the projection — "hidden" only means something if the templates
 * omit it, and they are given no code to do so.
 */

function hiding(fields: HideableField[]): Resume {
  return { ...fullResume(), hiddenFields: fields };
}

describe('field visibility', () => {
  it('shows everything when the resume carries no hiddenFields', () => {
    const resume = fullResume();
    expect(resume.hiddenFields).toBeUndefined();
    for (const field of HIDEABLE_FIELDS) expect(isFieldVisible(resume, field)).toBe(true);
  });

  /**
   * Records written before the feature existed carry no `hiddenFields` at all, and
   * an empty list is what an opted-out-then-back-in resume holds. Both have to
   * render exactly as they did — which identity states more strongly than a deep
   * comparison would.
   */
  it('returns the very same resume when nothing is hidden', () => {
    const resume = fullResume();
    expect(applyFieldVisibility(resume)).toBe(resume);
    // An empty list is what a resume holds after being opted out and back in.
    const emptied = { ...resume, hiddenFields: [] };
    expect(applyFieldVisibility(emptied)).toBe(emptied);
  });

  it('never offers to hide the name, surname or CV title', () => {
    for (const key of ['firstName', 'lastName', 'headline']) {
      expect(HIDEABLE_FIELDS).not.toContain(key);
    }
  });

  it('leaves untouched sub-objects identical, so memoized consumers see no change', () => {
    const resume = { ...hiding(['avatar']), media: { avatar: 'data:image/jpeg;base64,AAAA' } };
    const projected = applyFieldVisibility(resume);
    expect(projected.generalInfo).toBe(resume.generalInfo);
    expect(projected.basics).toBe(resume.basics);
    expect(projected.media).not.toBe(resume.media);
    expect(projected.media.avatar).toBeUndefined();
  });

  it('blanks every hidden field and leaves the rest of the CV alone', () => {
    const source = fullResume();
    const projected = applyFieldVisibility(hiding([...HIDEABLE_FIELDS]));

    expect(projected.media.avatar).toBeUndefined();
    expect(projected.basics.location).toBeUndefined();
    expect(projected.generalInfo.gender).toBeUndefined();
    expect(projected.generalInfo.maritalStatus).toBeUndefined();
    expect(projected.generalInfo.nationality).toBe('');
    expect(projected.generalInfo.dateOfBirth).toBe('');
    expect(projected.generalInfo.militaryStatus).toBeUndefined();
    expect(projected.generalInfo.driverLicense).toBeUndefined();
    expect(projected.summary).toBe('');

    // Identity and the CV's substance are never hideable.
    expect(projected.basics.firstName).toBe(source.basics.firstName);
    expect(projected.basics.lastName).toBe(source.basics.lastName);
    expect(projected.basics.headline).toBe(source.basics.headline);
    expect(projected.contact).toEqual(source.contact);
    expect(projected.experience).toHaveLength(source.experience.length);
    expect(projected.education).toHaveLength(source.education.length);
    expect(projected.skills).toHaveLength(source.skills.length);
  });

  /**
   * A city is stored as a dictionary CODE plus the label that was typed, and
   * `localizeResume` derives the label back FROM the code. Clearing only the label
   * would hide the city right up until the `cities` dictionary resolved, at which
   * point it would reappear on the page.
   */
  it('clears a hidden value’s dictionary code, not just its label', () => {
    const resume = hiding(['location']);
    resume.basics = { ...resume.basics, location: 'Bakı', locationCode: 'baku' };
    const projected = applyFieldVisibility(resume);
    expect(projected.basics.location).toBeUndefined();
    expect(projected.basics.locationCode).toBeUndefined();
  });

  it('does not mutate the resume it was given', () => {
    const resume = hiding(['summary', 'dateOfBirth']);
    const summary = resume.summary;
    applyFieldVisibility(resume);
    expect(resume.summary).toBe(summary);
    expect(resume.generalInfo.dateOfBirth).not.toBe('');
  });

  describe('withFieldVisibility', () => {
    it('adds, removes and stays idempotent', () => {
      expect(withFieldVisibility(undefined, 'summary', false)).toEqual(['summary']);
      expect(withFieldVisibility(['summary'], 'summary', false)).toEqual(['summary']);
      expect(withFieldVisibility(['summary', 'avatar'], 'summary', true)).toEqual(['avatar']);
      expect(withFieldVisibility(undefined, 'summary', true)).toEqual([]);
    });
  });

  /**
   * End to end, through the components that actually draw the CV: every template
   * must drop a hidden value and keep a visible one. Templates need no code for
   * this — blanked reads exactly like never-filled-in (BR-5) — so this is also the
   * test that keeps a template added LATER honest.
   *
   * The probe values are sentinels rather than realistic ones: the fixture is a
   * real CV and prints "Bakı" as four job locations as well as the home city, so
   * asserting on plausible text would prove nothing about which field was dropped.
   */
  describe('the rendered CV', () => {
    const t = i18n.getFixedT('az');
    const formatDate = makeDateFormatter('az');
    const SUMMARY = 'Summary-sentinel-9f2a.';
    const CITY = 'City-sentinel-9f2a';
    const AVATAR = 'data:image/jpeg;base64,AvatarSentinel9f2a';

    const markup = async (resume: Resume, load: RegisteredTemplate['load']): Promise<string> => {
      const Template = (await load()).default;
      return renderToStaticMarkup(
        createElement(Template, { resume: applyFieldVisibility(resume), t, formatDate }),
      );
    };

    /** The fixture with the probe values in place of its own. */
    const probe = (hiddenFields?: HideableField[]): Resume => {
      const resume = fullResume();
      return {
        ...resume,
        hiddenFields,
        summary: SUMMARY,
        basics: { ...resume.basics, location: CITY },
        media: { avatar: AVATAR },
        generalInfo: { ...resume.generalInfo, maritalStatus: 'married' },
      };
    };

    for (const { manifest, load } of listTemplates()) {
      it(`"${manifest.id}" drops a hidden summary and keeps a visible one`, async () => {
        const shown = await markup(probe(), load);
        expect(shown).toContain(SUMMARY);

        const hidden = await markup(probe(['summary']), load);
        expect(hidden).not.toContain(SUMMARY);
        // Still a CV: only that one field went away.
        expect(hidden).toContain(probe().basics.firstName);
        expect(hidden).toContain(probe().basics.headline);
        expect(hidden).toContain(t('cvLabels.dateOfBirth'));
      });

      it(`"${manifest.id}" drops a hidden general-info row together with its label`, async () => {
        const shown = await markup(probe(), load);
        expect(shown).toContain(t('cvLabels.maritalStatus'));
        expect(shown).toContain(t('dictionary.married'));

        const hidden = await markup(probe(['maritalStatus']), load);
        expect(hidden).not.toContain(t('cvLabels.maritalStatus'));
        expect(hidden).not.toContain(t('dictionary.married'));
        // Hiding one row is not hiding the block.
        expect(hidden).toContain(t('cvLabels.gender'));
      });
    }

    /**
     * The city is asserted across templates rather than per template because
     * `modern` does not print `basics.location` AT ALL — a pre-existing gap (it
     * shows the address contact channel instead), not something this toggle
     * introduced. Written as "whoever prints it must drop it", with a floor of one
     * template so the case cannot quietly become vacuous.
     */
    it('every template that prints the city drops it when hidden', async () => {
      let printedBy = 0;
      for (const { manifest, load } of listTemplates()) {
        const shown = await markup(probe(), load);
        if (!shown.includes(CITY)) continue;
        printedBy += 1;
        expect(await markup(probe(['location']), load), `${manifest.id} still prints the city`).not.toContain(CITY);
      }
      expect(printedBy, 'no template prints the city — the case proves nothing').toBeGreaterThan(0);
    });

    /**
     * Only `modern` prints a photo, so it is the one template that can prove the
     * avatar toggle works — and that unlike Remove it leaves the cropped image in
     * the resume, ready to come back.
     */
    it('drops the photo without deleting it', async () => {
      const modern = listTemplates().find((e) => e.manifest.id === 'modern');
      expect(modern, 'the modern template is registered').toBeTruthy();
      if (!modern) return;

      expect(await markup(probe(), modern.load)).toContain(AVATAR);

      const stored = probe(['avatar']);
      expect(await markup(stored, modern.load)).not.toContain(AVATAR);
      expect(stored.media.avatar).toBe(AVATAR);
    });
  });
});
