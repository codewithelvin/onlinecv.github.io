import type { ContactType } from '../../types/resume';

/**
 * The little mark printed after a contact value so the reader can tell WHICH
 * channel it is.
 *
 * A résumé prints a mobile, a landline, a WhatsApp number and a Telegram number
 * as four strings that look the same; the label that would disambiguate them
 * ("Mobil:", "WhatsApp:") is exactly the kind of noise a one-line contact header
 * has no room for. The mark carries it instead.
 *
 * ⚠️ THIS IS THE ONLY PLACE IN THE APP WHERE THE CV CARRIES ARTWORK BESIDES THE
 * AVATAR, and it is deliberately scoped to contacts. It does NOT extend to
 * section headings, skills, dates or anything else: everywhere else the words on
 * a CV already say what they are, and an ATS reads a picture as nothing at all.
 *
 * WHY PNG rather than SVG, which would be the obvious choice for an 8pt glyph:
 * `@react-pdf` draws an inline image inside a text run by handing textkit an
 * ATTACHMENT (`U+FFFC` with the image bound to it), and that path accepts an
 * `Image` only — a `Svg` child of a `Text` produces no fragments and vanishes
 * silently. Its image decoder in turn reads PNG and JPEG, so PNG it is. The files
 * are generated: `npx vite-node scripts/make-contact-icons.ts`.
 *
 * The text layer is UNAFFECTED, which is the property this feature had to have:
 * `@react-pdf/render` swaps the object-replacement glyph for a SPACE once the
 * image is painted, so an ATS reads `+994551234567 ` where it used to read
 * `+994551234567` — no stray character wedged into a phone number.
 */

/**
 * The two tones every icon is generated in, as the CSS colour the generator
 * paints with. A PNG cannot be tinted at draw time, so the tone has to be chosen
 * when the file is made and every surface in the app has to be covered by one of
 * these two.
 *
 * `dark` is BLACK AT 70%, not a flat grey, so it takes on whatever it is laid
 * over: `#4d4d4d` on white (classic prints its contacts in `#4a4a4a`, compact in
 * `#555555`) and `#4a4c4f` on the timeline's `#f1f2f4` sidebar. One file covers
 * all three within a shade of the text beside it.
 *
 * `light` is FLAT WHITE, and deliberately not the same trick. It exists for the
 * two templates whose contacts sit on a filled colour — banner's green band and
 * modern's blue sidebar — and on a mid-dark fill anything less than white reads
 * as grubby rather than as muted. (Their TEXT is a tint, `#cfe6d9` and `#d6e4fb`;
 * a hairline outline needs the extra contrast that body text does not.)
 *
 * Exported so the generator and the renderer cannot drift on what "dark" means.
 */
export const CONTACT_ICON_TONES = {
  dark: 'rgba(0,0,0,0.7)',
  light: '#ffffff',
} as const;

/** Which tone a template's contacts need — dark marks on paper, light on a fill. */
export type ContactIconTone = keyof typeof CONTACT_ICON_TONES;

/**
 * `<type>-<tone>.png` → its data URI, inlined at build time.
 *
 * `?inline` rather than a URL, for the reason the fonts are precached: an export
 * must work offline and must not depend on a second request landing before the
 * PDF is assembled. Discovered with `import.meta.glob` for the reason the
 * templates are — adding a channel means dropping in two files, never editing a
 * list of imports that can silently fall behind the folder.
 */
const FILES = import.meta.glob<string>('./icons/*.png', {
  eager: true,
  query: '?inline',
  import: 'default',
});

/**
 * The icon for a channel, or `undefined` if that channel has no artwork.
 *
 * Undefined is a real case rather than a bug: `ContactType` can grow before the
 * icons are regenerated, and a missing mark must degrade to the plain value the
 * CV printed before this existed — never to a broken image.
 */
export function contactIcon(type: ContactType, tone: ContactIconTone): string | undefined {
  return FILES[`./icons/${type}-${tone}.png`];
}

/** Every channel that HAS artwork, for the guard in `contact-icons.test.ts`. */
export function iconedContactTypes(): string[] {
  return Object.keys(FILES)
    .map((path) => /\.\/icons\/(.+)-(dark|light)\.png$/.exec(path)?.[1])
    .filter((type): type is string => Boolean(type));
}

/**
 * Air around the mark, added to its BOX rather than as a margin — 1.5pt a side.
 *
 * Deliberately symmetric, and that is what keeps this direction-agnostic. A
 * margin would have to move to the other side of the mark for an Arabic or Hebrew
 * CV (`direction.ts` exists because react-pdf has no logical properties), and
 * worse, react-pdf ignores margins on an inline attachment entirely — the box
 * width IS the advance. A wider box with the artwork centred in it means the
 * preview's `background: … center/contain` and the PDF's `fit` + `align: center`
 * land on the same pixels whichever way the line runs.
 */
const ICON_GAP = 3;

/**
 * Mark height as a fraction of the contact text's font size — Inter's CAP HEIGHT
 * (1490/2048), and that number is what makes the mark sit VERTICALLY CENTRED on
 * the text beside it.
 *
 * The mark's bottom edge is on the baseline and cannot be anywhere else: react-pdf
 * draws an inline attachment in a box whose bottom IS the baseline
 * (`renderAttachment` translates by `-height` and paints bottom-aligned), and a
 * browser puts an EMPTY inline-block's baseline at its bottom margin edge — so the
 * two agree, and neither can be pushed below the line. Given a fixed bottom,
 * "centred" is a question of HEIGHT: a mark exactly as tall as the capitals spans
 * the same band as the digits and capitals next to it, so its optical centre and
 * theirs coincide. Draw it taller — the flat 8pt that looked right in isolation —
 * and it rides visibly high, because all of the surplus goes above the cap line.
 *
 * Digits are what this is really aligned to: a contact line is phone numbers, and
 * Inter's figures are lining, i.e. cap height.
 */
const ICON_CAP_RATIO = 1490 / 2048;

/** How tall a mark is drawn beside text of a given size. Applied ONCE, here. */
export function contactIconHeight(textSize: number): number {
  return Math.round(textSize * ICON_CAP_RATIO * 100) / 100;
}

/**
 * The box a mark of a given drawn height occupies — wider than tall by `ICON_GAP`.
 *
 * The single source of this arithmetic, and it takes the RESOLVED height rather
 * than the text size because both renderers call it and only one of them knows
 * the text size: the preview derives the height and writes it into the markup,
 * and `services/pdf.ts` reads it back. Two copies of "height plus three" is
 * precisely how a preview and a PDF start disagreeing by a point and a half.
 */
export function contactIconBox(height: number): { width: number; height: number } {
  return { width: height + ICON_GAP, height };
}

/**
 * Drop the mark artwork from rendered markup on its way to `react-pdf-html`.
 *
 * The PDF does not read it — `services/pdf.ts` resolves the same file from
 * `data-contact-icon` — and leaving it in costs twice: `react-pdf-html` warns
 * `Found unsupported style "background"` once per channel on every export, and
 * css-tree parses a couple of kilobytes of base64 per mark to reach a declaration
 * it then throws away.
 *
 * Narrow on purpose. It matches a base64 PNG inside a `background` shorthand and
 * nothing else, so an avatar (`<img src="data:image/jpeg…">`) and any future
 * `background-color` are untouched; base64's alphabet contains no `)`, so the URL
 * cannot run past its own closing bracket.
 */
export function stripIconArt(html: string): string {
  return html.replace(/background:url\(data:image\/png;base64,[A-Za-z0-9+/=]+\)[^;"]*;?/g, '');
}
