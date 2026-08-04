import type { JSX, ReactNode } from 'react';
import type { Locale } from '../../types/resume';

/**
 * A flag per UI language, drawn as inline SVG.
 *
 * NOT emoji. `🇦🇿` is a pair of regional-indicator code points that a font has to
 * map to a flag glyph, and Windows ships no such font — the browser falls back to
 * rendering the indicators themselves, i.e. the letters "AZ". Beside a label that
 * already says `(AZ)` that reads as a rendering bug, which is why the switcher
 * carried no flags until now. Inline SVG draws the same everywhere and costs no
 * request.
 *
 * SIMPLIFIED IS NOT INVENTED, and the line between them is the rule this file is
 * built on. Simplification is allowed where it does not change what the flag IS:
 * Spain without its coat of arms is the civil flag, and Georgia's Bolnisi crosses
 * are drawn as plain bars. It is NOT allowed where the detail is the identity, so
 * the US canton carries all fifty stars in the real nine-row arrangement, the
 * Saudi inscription is set as actual Arabic text, and Korea's four trigrams are the
 * four real ones in their four real corners. They are decorative, so `Flag` hides
 * them from assistive technology; the endonym and the ISO code carry the meaning.
 *
 * A flag names a COUNTRY, not a language, so four of these are a choice rather than
 * a fact: English takes the United States, Spanish takes Spain, Arabic takes Saudi
 * Arabia (of its 22 states) and Korean takes the South.
 */

/** Colour of the middle band on the Azerbaijani flag — the crescent is cut from it. */
const AZ_RED = '#EF3340';
const US_RED = '#B22234';
const GE_RED = '#FF0000';
const SA_GREEN = '#006C35';
const IL_BLUE = '#0038B8';
const KR_RED = '#cd2e3a';
const KR_BLUE = '#0047a0';

/**
 * The angle everything on the Korean flag is rotated by: `atan(2/3)`, the angle of
 * a 3:2 flag's own diagonal. Both the taeguk's dividing line and the four trigrams
 * follow it, which is why one constant serves all of them.
 */
const KR_DIAGONAL = 33.69006752597979;

/**
 * The 50 star positions on the US canton: nine rows, six stars then five,
 * alternating. Computed rather than typed out, so the count cannot drift.
 */
const US_STARS: Array<[number, number]> = Array.from({ length: 9 }, (_, row) => {
  const six = row % 2 === 0;
  const count = six ? 6 : 5;
  const cantonW = 9.6;
  const cantonH = (16 / 13) * 7;
  const stepX = cantonW / 12;
  return Array.from({ length: count }, (_, col): [number, number] => [
    stepX * (six ? 1 + col * 2 : 2 + col * 2),
    (cantonH / 10) * (1 + row),
  ]);
}).flat();

/** An 8-pointed star: two squares, one turned 45°. */
function Star8({ cx, cy, r }: { cx: number; cy: number; r: number }): JSX.Element {
  const side = r * 1.4;
  const common = { x: cx - side / 2, y: cy - side / 2, width: side, height: side, fill: '#fff' };
  return (
    <>
      <rect {...common} />
      <rect {...common} transform={`rotate(45 ${cx} ${cy})`} />
    </>
  );
}

/** A small Bolnisi cross, as used four times on the Georgian flag. */
function SmallCross({ cx, cy }: { cx: number; cy: number }): JSX.Element {
  return (
    <>
      <rect x={cx - 0.45} y={cy - 1.35} width={0.9} height={2.7} fill={GE_RED} />
      <rect x={cx - 1.35} y={cy - 0.45} width={2.7} height={0.9} fill={GE_RED} />
    </>
  );
}

/** The artwork, one entry per locale — a total record, so a new language must add one. */
const FLAGS: Record<Locale, ReactNode> = {
  az: (
    <>
      <rect width={24} height={5.34} fill="#0092BC" />
      <rect y={5.33} width={24} height={5.34} fill={AZ_RED} />
      <rect y={10.66} width={24} height={5.34} fill="#509E2F" />
      {/* Crescent = a white disc with a band-coloured disc bitten out of it. */}
      <circle cx={10.9} cy={8} r={2.5} fill="#fff" />
      <circle cx={11.8} cy={8} r={2.05} fill={AZ_RED} />
      <Star8 cx={14.2} cy={8} r={1.15} />
    </>
  ),
  ru: (
    <>
      <rect width={24} height={5.34} fill="#fff" />
      <rect y={5.33} width={24} height={5.34} fill="#0039A6" />
      <rect y={10.66} width={24} height={5.34} fill="#D52B1E" />
    </>
  ),
  /**
   * United States — the user's choice for English (see the note above).
   *
   * 13 stripes and all FIFTY stars, in the real nine-row 6-5-6-5… arrangement
   * rather than a token handful. Each star occupies about one unit of this
   * viewBox, where a five-pointed outline and a dot are the same two pixels, so
   * the honest thing to get right is the count and the layout — which is what a
   * reader recognizes the canton by.
   */
  en: (
    <>
      <rect width={24} height={16} fill={US_RED} />
      {[1, 3, 5, 7, 9, 11].map((i) => (
        <rect key={i} y={(16 / 13) * i} width={24} height={16 / 13} fill="#fff" />
      ))}
      <rect width={9.6} height={(16 / 13) * 7} fill="#3C3B6E" />
      {US_STARS.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={0.3} fill="#fff" />
      ))}
    </>
  ),
  ka: (
    <>
      <rect width={24} height={16} fill="#fff" />
      <rect x={9.6} width={4.8} height={16} fill={GE_RED} />
      <rect y={5.6} width={24} height={4.8} fill={GE_RED} />
      <SmallCross cx={4.8} cy={2.8} />
      <SmallCross cx={19.2} cy={2.8} />
      <SmallCross cx={4.8} cy={13.2} />
      <SmallCross cx={19.2} cy={13.2} />
    </>
  ),
  /**
   * Saudi Arabia — the real flag, not a stand-in: green field, the shahada in
   * white above a white sword whose blade points to the hoist (left) and whose
   * hilt is on the fly side.
   *
   * The inscription is rendered as ACTUAL Arabic text rather than drawn as
   * decorative squiggles, which is the only honest way to reproduce a flag that
   * mostly consists of writing — `textLength` + `lengthAdjust` squeeze the real
   * glyphs to the flag's width instead of substituting a shape for them. It sets
   * its own `direction`/`fontFamily` because this SVG is not inside the CV's text
   * area and inherits neither.
   */
  ar: (
    <>
      <rect width={24} height={16} fill={SA_GREEN} />
      <text
        x={12}
        y={7.4}
        textAnchor="middle"
        textLength={20}
        lengthAdjust="spacingAndGlyphs"
        direction="rtl"
        fill="#fff"
        fontSize={4}
        fontFamily="NotoSansArabic, Inter, sans-serif"
      >
        لا إله إلا الله محمد رسول الله
      </text>
      {/* Blade tapering to a point on the left, guard and pommel on the right. */}
      <polygon points="2.2,11.6 5,10.8 19.6,10.8 19.6,12.4 5,12.4" fill="#fff" />
      <rect x={19.4} y={9.9} width={0.85} height={3.4} rx={0.3} fill="#fff" />
      <rect x={20.7} y={10.7} width={1.5} height={1.8} rx={0.6} fill="#fff" />
    </>
  ),
  es: (
    <>
      <rect width={24} height={16} fill="#AA151B" />
      <rect y={4} width={24} height={8} fill="#F1BF00" />
    </>
  ),
  /**
   * Israel: white field, two blue stripes, and the Magen David between them.
   *
   * The star is drawn as the flag draws it — two overlapping equilateral triangles
   * STROKED rather than filled, so the interlaced hexagram with the open centre is
   * what appears. A filled hexagram would be a different emblem.
   */
  he: (
    <>
      <rect width={24} height={16} fill="#fff" />
      <rect y={2.1} width={24} height={2.1} fill={IL_BLUE} />
      <rect y={11.8} width={24} height={2.1} fill={IL_BLUE} />
      <polygon points="12,5.1 14.6,9.6 9.4,9.6" fill="none" stroke={IL_BLUE} strokeWidth={0.62} />
      <polygon points="12,10.9 9.4,6.4 14.6,6.4" fill="none" stroke={IL_BLUE} strokeWidth={0.62} />
    </>
  ),
  /**
   * South Korea — the Taegukgi, at its OFFICIAL construction rather than an
   * eyeballed approximation.
   *
   * This flag is the one case where "simplified but real" could not be done by
   * hand: its four trigrams are not decoration, they are 건·곤·감·리 (heaven, earth,
   * water, fire), and which corner each sits in and which of its three bars are
   * broken is what the flag MEANS. Getting a bar wrong draws a flag that does not
   * exist. So the geometry below is the government construction, transcribed: the
   * taeguk is half the flag's height, the trigrams are three bars of length 24 and
   * width 4 on a 144×96 field, and everything is rotated by the flag's diagonal.
   *
   * Drawn in that 144×96 coordinate system and scaled into this file's 24×16 box,
   * so the numbers stay the published ones and can be checked against the source.
   * Each trigram is one `path` of vertical strokes stacked along x: three whole
   * bars is 건, three split ones is 곤, and the two mixed ones are 감 and 리.
   * Conveniently every trigram on this flag is palindromic (solid-solid-solid,
   * broken-broken-broken, broken-solid-broken, solid-broken-solid), so no ordering
   * question arises for any of them.
   */
  ko: (
    <>
      <rect width={24} height={16} fill="#fff" />
      <g transform="translate(12 8) scale(0.1666667)">
        <g stroke="#000" strokeWidth={4} fill="none">
          {/* Upper hoist 건 (three whole bars) and, opposite it, lower fly 곤. */}
          <path
            transform={`rotate(${KR_DIAGONAL})`}
            d="M-50-12v24m6 0v-24m6 0v24m76 0V1m0-2v-11m6 0v11m0 2v11m6 0V1m0-2v-11"
          />
          {/* Lower hoist 리 (solid-broken-solid) and upper fly 감 (broken-solid-broken). */}
          <path
            transform={`rotate(${-KR_DIAGONAL})`}
            d="M-50-12v24m6 0V1m0-2v-11m6 0v24m76 0V1m0-2v-11m6 0v24m6 0V1m0-2v-11"
          />
        </g>
        {/* The taeguk: red over blue, divided by an S of two 12-radius arcs. */}
        <g transform={`rotate(${KR_DIAGONAL})`}>
          <path fill={KR_RED} d="M12 0a18 18 0 1 1 -36 0a24 24 0 1 1 48 0" />
          <path fill={KR_BLUE} d="M-24 0a24 24 0 1 0 48 0A12 12 0 1 0 0 0a12 12 0 1 1 -24 0" />
        </g>
      </g>
    </>
  ),
};

/**
 * The flag for a locale, at the size the picker draws it.
 *
 * `aria-hidden` on purpose: every flag in this app sits next to the language's own
 * name, so announcing it would only repeat it — and a flag is a poor name for a
 * language in the first place.
 */
export function Flag({ locale, size = 24 }: { locale: Locale; size?: number }): JSX.Element {
  return (
    <svg
      data-flag={locale}
      aria-hidden
      focusable="false"
      width={size}
      height={(size / 3) * 2}
      viewBox="0 0 24 16"
      style={{ borderRadius: 2, flexShrink: 0, display: 'block' }}
    >
      {FLAGS[locale]}
      {/* A hairline, so the white edge of the Russian or Georgian flag still has
          an outline against a white tile. Drawn last, i.e. over the artwork. */}
      <rect
        x={0.25}
        y={0.25}
        width={23.5}
        height={15.5}
        rx={1.75}
        fill="none"
        stroke="rgba(0,0,0,0.18)"
        strokeWidth={0.5}
      />
    </svg>
  );
}
