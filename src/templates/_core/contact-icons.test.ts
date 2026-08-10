import { describe, expect, it } from 'vitest';
import { ALL_CONTACT_TYPES } from '../../features/editor/enums';
import {
  CONTACT_ICON_TONES,
  contactIcon,
  contactIconBox,
  contactIconHeight,
  iconedContactTypes,
  stripIconArt,
  type ContactIconTone,
} from './contact-icons';

const TONES = Object.keys(CONTACT_ICON_TONES) as ContactIconTone[];

/**
 * The channel marks: the artwork registry and the arithmetic that places a mark
 * on the line. The rendered result is guarded in `templates.test.tsx` (markup)
 * and `full-profile.test.tsx` (the finished PDF).
 */
describe('contact icons', () => {
  /**
   * TOTAL over the channels a CV can hold — the point of the test.
   *
   * `contactIcon` returns `undefined` for artwork it does not have and
   * `ContactIcon` then prints the value bare, which is the right way to degrade
   * but also completely silent. So the coverage has to be asserted somewhere, and
   * this is it: add a `ContactType` without running
   * `npx vite-node scripts/make-contact-icons.ts` and the channel ships unmarked
   * while every other test stays green.
   */
  it('has artwork for every contact type, in both tones', () => {
    for (const type of ALL_CONTACT_TYPES) {
      for (const tone of TONES) {
        expect(contactIcon(type, tone), `${type}/${tone} has no artwork`).toBeTruthy();
      }
    }
  });

  /** …and nothing beyond them, so a renamed channel leaves no orphan file behind. */
  it('ships no artwork for a channel that no longer exists', () => {
    expect([...new Set(iconedContactTypes())].sort()).toEqual([...ALL_CONTACT_TYPES].sort());
  });

  /**
   * PNG, not SVG — and this is a hard requirement of the export rather than a
   * preference. `@react-pdf` draws an inline image inside running text by handing
   * textkit an attachment, and its decoder reads PNG and JPEG only; an SVG data
   * URI would render perfectly in the preview and silently disappear from every
   * exported CV.
   */
  it('ships PNG data URIs, which is what the PDF engine can decode', () => {
    for (const type of ALL_CONTACT_TYPES) {
      expect(contactIcon(type, 'dark')).toMatch(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/);
    }
  });

  /** The two tones are different files — otherwise `iconTone` is a no-op. */
  it('draws the light tone differently from the dark one', () => {
    expect(contactIcon('mobile', 'light')).not.toBe(contactIcon('mobile', 'dark'));
  });

  /**
   * A mark is as tall as the text's CAPITALS, which is what makes it read as
   * vertically centred: its bottom edge is pinned to the baseline in both targets
   * (react-pdf paints an attachment bottom-aligned; an empty inline-block's
   * baseline is its bottom margin edge), so height is the only lever left, and a
   * mark spanning exactly the cap band shares its optical centre with the digits
   * beside it.
   */
  it('sizes a mark to the cap height of the text beside it', () => {
    expect(contactIconHeight(10)).toBeCloseTo(7.28, 2);
    expect(contactIconHeight(8.5)).toBeCloseTo(6.18, 2);
    // Never taller than the text: that is what riding high looks like.
    for (const size of [8, 8.5, 9, 10, 11]) {
      expect(contactIconHeight(size)).toBeLessThan(size);
    }
  });

  /** The box is wider than the mark; the surplus is the air around it. */
  it('gives a mark a box wider than it is tall', () => {
    const box = contactIconBox(8);
    expect(box.height).toBe(8);
    expect(box.width).toBeGreaterThan(box.height);
  });
});

describe('stripIconArt', () => {
  const ART = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

  it('removes the background the PDF path cannot use', () => {
    const html = `<span data-contact-icon="mobile" style="display:inline-block;width:11px;height:8px;background:url(${ART}) center/contain no-repeat"></span>`;
    const out = stripIconArt(html);
    expect(out).not.toContain('base64');
    // The identity survives — it is what `services/pdf.ts` re-resolves the file from.
    expect(out).toContain('data-contact-icon="mobile"');
    expect(out).toContain('width:11px');
  });

  /**
   * The avatar is a data URL too, and it is the one image the PDF DOES read out
   * of the markup. Stripping it would blank the photo on three templates.
   */
  it('leaves the avatar alone', () => {
    const html = '<img src="data:image/jpeg;base64,/9j/4AAQSkZJRg==" alt="" />';
    expect(stripIconArt(html)).toBe(html);
  });

  it('leaves an ordinary background colour alone', () => {
    const html = '<div style="background:#0d7a45;color:#fff"></div>';
    expect(stripIconArt(html)).toBe(html);
  });
});
