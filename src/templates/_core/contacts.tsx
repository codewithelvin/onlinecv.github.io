import { Fragment, type CSSProperties, type JSX } from 'react';
import type { ContactItem } from '../../types/resume';
import { contactDisplay, contactHref } from './render-helpers';
import {
  contactIcon,
  contactIconBox,
  contactIconHeight,
  type ContactIconTone,
} from './contact-icons';

/**
 * Contact channels drawn as LINKS, each followed by the mark that says WHICH
 * channel it is — one implementation for the live preview and the exported PDF.
 *
 * Part of the core (spec §7.1), for the same reason `BulletList` is: what a
 * phone number or a WhatsApp handle turns into is a property of the channel, not
 * of the layout, so a template only chooses whether its contacts are anchors and
 * every template — present and future — gets the same targets. `contactHref`
 * builds them; an unlinkable channel (a postal address) falls back to plain text
 * that renders byte-identically to what was there before.
 *
 * `react-pdf-html` maps `<a href>` to react-pdf's `Link`, so the PDF carries a
 * real annotation, and its own `a { textDecoration: underline }` survives
 * `resetStyles` — which is why `style` here is not optional decoration: a
 * template passes the colour of the surrounding text plus
 * `textDecoration: 'none'`, and the CV looks exactly as it did on paper while
 * becoming tappable on screen. The visible STRING is unchanged either way, so
 * an ATS reads the same contact line it always did.
 */

/**
 * The channel mark: an empty inline box carrying its artwork as a background.
 *
 * Empty ON PURPOSE. `react-pdf-html` decides inline-versus-block from the tag
 * table and from the element's CHILDREN — an `<img>` or an `<svg>` in here would
 * make this span block content, which breaks the contact line into stacked
 * fragments in the PDF. A childless `<span>` stays in the same text bucket as the
 * value beside it, and `services/pdf.ts` turns it into react-pdf's inline image
 * attachment. That is also why the artwork rides in `background` rather than in a
 * `src`.
 *
 * The three `data-*` attributes are the channel between this and the PDF
 * renderer: the markup is the only thing that crosses that boundary, and
 * `services/pdf.ts` re-resolves the very same file from them (it cannot read the
 * `background`, which is stripped before parsing — see `stripIconArt`).
 */
function ContactIcon({
  item,
  tone,
  textSize,
}: {
  item: ContactItem;
  tone: ContactIconTone;
  textSize: number;
}): JSX.Element | null {
  const src = contactIcon(item.type, tone);
  // A channel with no artwork prints exactly as it did before icons existed.
  if (!src) return null;
  const { width, height } = contactIconBox(contactIconHeight(textSize));
  return (
    <span
      data-contact-icon={item.type}
      data-contact-icon-tone={tone}
      data-contact-icon-size={height}
      style={{
        display: 'inline-block',
        width,
        height,
        /*
         * `contain` inside a box wider than the mark is tall, which centres the
         * artwork horizontally and leaves `ICON_GAP` of air split between the two
         * sides. react-pdf's `fit` + `align: center` does exactly the same thing
         * with the same numbers — see `services/pdf.ts`.
         *
         * No `vertical-align`: the default `baseline` puts an EMPTY inline-block's
         * bottom margin edge on the baseline, which is the one placement the PDF
         * can also produce. `ICON_CAP_RATIO` is what makes that centred.
         */
        background: `url(${src}) center/contain no-repeat`,
      }}
    />
  );
}

/** What a template says about the marks it wants; every field has a default. */
export interface ContactIconStyle {
  /**
   * `dark` for contacts printed on paper, `light` for contacts on a filled
   * sidebar or band. See `CONTACT_ICON_TONES`.
   */
  iconTone?: ContactIconTone;
  /**
   * The font size of the contact TEXT, not of the mark.
   *
   * Deliberately the text's size: the mark is derived from it
   * (`contactIconBox`), which is what keeps it vertically centred on the line in
   * every template without six hand-tuned numbers that nobody re-tunes when a
   * font size changes.
   */
  textSize?: number;
}

const DEFAULT_TONE: ContactIconTone = 'dark';
const DEFAULT_TEXT_SIZE = 10;

/** One channel: an anchor when it has a target, its bare text when it does not. */
export function ContactValue({
  item,
  style,
  iconTone = DEFAULT_TONE,
  textSize = DEFAULT_TEXT_SIZE,
}: {
  item: ContactItem;
  /** The template's link style — see above; without it the anchor underlines. */
  style?: CSSProperties;
} & ContactIconStyle): JSX.Element {
  const href = contactHref(item);
  const text = contactDisplay(item);
  const icon = <ContactIcon item={item} tone={iconTone} textSize={textSize} />;
  if (!href)
    return (
      <>
        {text}
        {icon}
      </>
    );
  return (
    <>
      {/*
       * `target`/`rel` are for the preview only — the editor is a single route
       * holding unsaved work, so a mistyped click must not navigate away from it.
       * `react-pdf-html` reads `href` and ignores the rest.
       *
       * The mark sits OUTSIDE the anchor: it labels the channel, it is not part of
       * what the reader is clicking, and keeping it out leaves the link's
       * annotation rectangle exactly the width of the text it always was.
       */}
      <a href={href} target="_blank" rel="noreferrer" style={style}>
        {text}
      </a>
      {icon}
    </>
  );
}

/**
 * Several channels run together on one line, the way the single-column templates
 * print them.
 *
 * The separator stays a plain text node between the anchors, so the character
 * sequence — and therefore the bidi resolution and the PDF's text layer — is the
 * same one the old `.join()` produced.
 */
export function ContactList({
  items,
  separator,
  style,
  iconTone,
  textSize,
}: {
  items: ContactItem[];
  /** What goes between two channels, e.g. `'  •  '`. */
  separator: string;
  style?: CSSProperties;
} & ContactIconStyle): JSX.Element {
  return (
    <>
      {items.map((item, i) => (
        <Fragment key={item.id}>
          {i > 0 ? separator : null}
          <ContactValue item={item} style={style} iconTone={iconTone} textSize={textSize} />
        </Fragment>
      ))}
    </>
  );
}
