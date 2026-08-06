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
 * A flag names a COUNTRY, not a language, so five of these are a choice rather than
 * a fact: English takes the United States, Spanish takes Spain, Arabic takes Saudi
 * Arabia (of its 22 states), Korean takes the South, and Chinese takes the People's
 * Republic — the state whose written standard is the simplified one this locale is
 * translated into.
 */

/** Colour of the middle band on the Azerbaijani flag — the crescent is cut from it. */
const AZ_RED = '#EF3340';
const US_RED = '#B22234';
const GE_RED = '#FF0000';
const SA_GREEN = '#006C35';
const IL_BLUE = '#0038B8';
const KR_RED = '#cd2e3a';
const KR_BLUE = '#0047a0';
const CN_RED = '#EE1C25';
const CN_YELLOW = '#FFFF00';
/**
 * Japan's 紅色, as the 1999 Act on National Flag and Anthem specifies it. The law
 * itself gives the colour by name rather than by coordinates; #BC002D is the sRGB
 * value the Cabinet Office's own artwork uses.
 */
const JP_RED = '#BC002D';
/**
 * The disc's diameter is three fifths of the HOIST, and since 1999 its centre is
 * the centre of the flag (the pre-1999 specification offset it 1/100 towards the
 * hoist, which is the detail most redrawings get wrong in the other direction by
 * keeping the offset). The 2:3 ratio the law prescribes is exactly this file's
 * 24 × 16 box, so nothing here is scaled or approximated.
 */
const JP_DISC_R = (16 * 3) / 5 / 2;
/**
 * France, at the government's CURRENT charter rather than the shade most stock
 * artwork still uses: the navy `#000091` and `#E1000F` were restored in July 2020,
 * reversing the lighter 1976 pair (`#0055A4`/`#EF4135`). Both are real, so this is
 * a choice, and it is the one the French state itself publishes.
 */
const FR_BLUE = '#000091';
const FR_RED = '#E1000F';
/** Germany, at the federal cabinet's 1999 specification. */
const DE_RED = '#FF0000';
const DE_GOLD = '#FFCC00';
/** Italy: the sRGB renderings of the 2006 Pantone definition (17-6153 / 11-0601 / 18-1662). */
const IT_GREEN = '#008C45';
const IT_WHITE = '#F4F5F0';
const IT_RED = '#CD212A';
const TR_RED = '#E30A17';

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

/**
 * The five stars on the flag of the People's Republic of China, at their OFFICIAL
 * construction rather than an eyeballed arrangement.
 *
 * The specification divides the flag's upper-left quarter into a 15 × 10 grid and
 * places every star on a grid intersection: the large star's centre at (5, 5) with
 * a circumscribed radius of 3, and the four small ones at (10, 2), (12, 4), (12, 7)
 * and (10, 9) with a radius of 1 — measured on a flag 30 wide and 20 tall. That is
 * the same 3:2 this file's 24 × 16 box already is, so a single factor maps all of
 * it and the numbers below stay the published ones, checkable against the source.
 *
 * The detail that is easy to lose and that IS the flag: the four small stars are
 * not upright. Each one is turned so that ONE of its points aims at the centre of
 * the large star, which is why the rotation below is computed from the two centres
 * instead of typed in — four hand-written angles are four chances to be wrong.
 */
const CN_SCALE = 24 / 30;
const CN_BIG: [number, number] = [5, 5];
const CN_SMALL: Array<[number, number]> = [
  [10, 2],
  [12, 4],
  [12, 7],
  [10, 9],
];

/**
 * A pentagram's waist as a fraction of its circumscribed radius. Not a taste
 * decision: `cos 72° / cos 36°` is what makes the five points meet at 36°, the
 * shape every flag-star is.
 */
const PENTAGRAM_WAIST = Math.cos((72 * Math.PI) / 180) / Math.cos((36 * Math.PI) / 180);

/**
 * The ten vertices of a five-pointed star — outer point, waist, outer point … —
 * `rotate` degrees clockwise from one-point-up.
 *
 * Shared by the Chinese and Turkish flags, which need the same shape at different
 * rotations. Kept as the ten-vertex outline rather than the self-intersecting
 * five-vertex `{5/2}` polygon the published Turkish artwork uses: the two render
 * identically, and this one does not depend on the fill rule.
 */
function pentagramPoints(cx: number, cy: number, r: number, rotate = 0): string {
  return Array.from({ length: 10 }, (_, i) => {
    const angle = ((-90 + rotate + i * 36) * Math.PI) / 180;
    const radius = i % 2 === 0 ? r : r * PENTAGRAM_WAIST;
    return `${(cx + radius * Math.cos(angle)).toFixed(3)},${(cy + radius * Math.sin(angle)).toFixed(3)}`;
  }).join(' ');
}

/** One of the Chinese flag's stars: `rotate` degrees clockwise from one-point-up. */
function CnStar({
  cx,
  cy,
  r,
  rotate = 0,
}: {
  cx: number;
  cy: number;
  r: number;
  rotate?: number;
}): JSX.Element {
  return <polygon points={pentagramPoints(cx, cy, r, rotate)} fill={CN_YELLOW} />;
}

/**
 * The Turkish flag's crescent and star, at the construction in the Türk Bayrağı
 * Kanunu — and this flag is the one case in this file where the published
 * geometry maps onto the 24 × 16 box EXACTLY: Turkey's official ratio is 2:3, so
 * the law's 90000 × 60000 field is the same shape, scaled by 1/3750. Every number
 * below is therefore the legal one, checkable against the source.
 *
 * `E = ⅓G`, the one measurement the law's summary tables state ambiguously (edge
 * to edge? centre to centre?), is NOT used here. The star's centre is taken from
 * the official artwork instead, which resolves it: at 49250 the star's inner point
 * reaches x = 41750, i.e. PAST the crescent's horn tips at 42675 — the star sits
 * inside the crescent's opening rather than clear of it, which is the detail an
 * eyeballed Turkish flag always gets wrong.
 *
 * ⚠️ AND THE ROTATION, which no prose description of this flag states: the five
 * points sit at 180°, ±108° and ±36°, so ONE POINT AIMS AT THE HOIST — straight
 * into the crescent. Derived from the official artwork's own vertex coordinates,
 * not guessed; `rotate: -90` puts a point at 180° for a shape with 72° symmetry.
 */
const TR_SCALE = 24 / 90000;
const TR_CRESCENT_OUTER = { cx: 30000, r: 15000 };
const TR_CRESCENT_INNER = { cx: 33750, r: 12000 };
const TR_STAR = { cx: 49250, r: 7500, rotate: -90 };

/** Poland's legally-named "flag red" (the Pantone 032 C equivalent most references use). */
const PL_RED = '#DC143C';
/** Hungary's 2011 constitution names Pantone shades for its tricolour; these are their sRGB equivalents. */
const HU_RED = '#CE2939';
const HU_GREEN = '#436F4D';
/**
 * Greece, like Turkey below-turned-Georgia above, is a case where the LAW never
 * fixed a shade: the flag statute names the colour only as "κυανός" (blue), with
 * no Pantone reference for the flag itself (only for the coat of arms). `#014488`
 * is the value the Greek government's own 2010 digital-assets document uses, so
 * it is a real source rather than a guess — just not a binding one the way
 * Turkey's crescent geometry is.
 */
const EL_BLUE = '#014488';
/**
 * Portugal's flag law (1911) fixes the GEOMETRY precisely (below) but is silent
 * on exact shades, same gap as Greece's blue — these are the green/red/gold/blue
 * most web references converge on, not a legal citation.
 */
const PT_GREEN = '#046A38';
const PT_RED = '#DA020E';
const PT_GOLD = '#F0C300';
/** Heraldic blue for the five "quinas" — the small shields inside the coat of arms. */
const PT_BLUE = '#003893';
/** Kazakhstan's flag decree specifies these two exactly: the field and everything gold on it. */
const KZ_BLUE = '#00ABC2';
const KZ_GOLD = '#FFEC2D';
/**
 * Uzbekistan is the same gap again — confirmed rather than assumed: the
 * government "does not specify which hues should be used… and instead
 * generalizes them as azure, white, green, and red." Widely-used web reference
 * shades, not a citation.
 */
const UZ_BLUE = '#0099B5';
const UZ_GREEN = '#0F9D58';
const UZ_RED = '#CE1126';

/** A point at `deg` degrees (0 = toward the hoist/+x, 90 = down), `r` from centre. */
function polarPoint(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
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

/**
 * Greece: nine equal horizontal stripes, five cyan/blue and four white, blue
 * FIRST and LAST — confirmed against the flag's own 1978 law rather than
 * assumed. The canton is a square of exactly five stripes' height, and the
 * cross inside it is one stripe thick (the "one fifth of the [canton's] side"
 * the law states), so `EL_STRIPE` alone drives both.
 */
const EL_STRIPE = 16 / 9;
const EL_CANTON = 5 * EL_STRIPE;

/**
 * Portugal's shield silhouette — a rectangle with a shallow curved point at
 * the bottom, reused at two sizes (the red bordure and the smaller white
 * inescutcheon inside it).
 */
function shieldPath(w: number, h: number): string {
  const shoulder = h * 0.68;
  return `M0,0 H${w} V${shoulder} Q${w},${h} ${w / 2},${h} Q0,${h} 0,${shoulder} Z`;
}

/**
 * One of the five "quinas" on the Portuguese shield: a small blue square
 * carrying five white bezants in saltire (four corners plus one centre).
 * Simplified from the real charge (a proper small shield, each bezant itself
 * outlined) to a plain square and five dots — enough to read as "the five
 * shields with their five dots," which is the detail that makes the coat of
 * arms recognizable, without drawing five nested shield outlines at a size
 * where they would be a handful of pixels.
 */
function Quina({ cx, cy, s }: { cx: number; cy: number; s: number }): JSX.Element {
  const r = s * 0.14;
  const off = s * 0.27;
  const dots: Array<[number, number]> = [
    [-off, -off],
    [off, -off],
    [0, 0],
    [-off, off],
    [off, off],
  ];
  return (
    <g>
      <rect x={cx - s / 2} y={cy - s / 2} width={s} height={s} fill={PT_BLUE} />
      {dots.map(([dx, dy], i) => (
        <circle key={i} cx={cx + dx} cy={cy + dy} r={r} fill="#fff" />
      ))}
    </g>
  );
}

/**
 * One of the seven gold castles on the Portuguese shield's red bordure,
 * simplified to a small crenellated square — the count (seven) and their
 * rough distribution (three along the top, two at the sides, two lower) are
 * the real construction; the towers themselves are not individually modeled.
 */
function Castle({ cx, cy }: { cx: number; cy: number }): JSX.Element {
  const w = 0.55;
  const h = 0.4;
  return (
    <g fill={PT_GOLD}>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} />
      <rect x={cx - w / 2} y={cy - h / 2 - 0.14} width={w / 3} height={0.14} />
      <rect x={cx - w / 6} y={cy - h / 2 - 0.14} width={w / 3} height={0.14} />
      <rect x={cx + w / 6} y={cy - h / 2 - 0.14} width={w / 3} height={0.14} />
    </g>
  );
}

/**
 * Kazakhstan's sun: 32 rays (one per ethnicity the flag's own description
 * credits), computed as equal triangles rather than typed out individually —
 * the same reasoning as the US's 50 stars above.
 */
const KZ_RAY_COUNT = 32;
function sunRayPoints(cx: number, cy: number, rInner: number, rOuter: number, deg: number): string {
  const halfWidth = (360 / KZ_RAY_COUNT / 2) * 0.55;
  const tip = polarPoint(cx, cy, rOuter, deg);
  const baseA = polarPoint(cx, cy, rInner, deg - halfWidth);
  const baseB = polarPoint(cx, cy, rInner, deg + halfWidth);
  return [baseA, tip, baseB].map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');
}

/**
 * Kazakhstan's soaring steppe eagle (berkut), simplified to a single
 * swept-wing silhouette — real heraldic depictions render individual flight
 * feathers, which is not a shape a 24×16 canvas can hold at all; a gull-wing
 * outline with a body and a short tail is the same POSE (soaring, wings
 * spread, seen from below) without inventing a different bird.
 */
const KZ_EAGLE_PATH =
  'M-5.5,0 C-4,-1.7 -1.8,-1.9 0,-0.5 C1.8,-1.9 4,-1.7 5.5,0 ' +
  'C4,0.5 1.8,0.8 0,0.5 C-1.8,0.8 -4,0.5 -5.5,0 Z M-0.5,0.5 L0,2.3 L0.5,0.5 Z';

/**
 * Uzbekistan's crescent-and-stars group. The flag's own construction sheet
 * places it in a rectangle "30 by 75 cm" starting "20 cm from the flagpole,"
 * all measured against the flag's 125×250 cm module — read as a HEIGHT/WIDTH
 * pair against their respective axes, since that is how a construction sheet
 * is meant to be scaled. The twelve stars' own spacing (also stated in cm) is
 * approximated proportionally within that rectangle rather than plotted from
 * the crescent tip point-by-point, which would need the full published diagram
 * rather than the prose describing it.
 */
const UZ_BLUE_STRIPE_H = 16 * (40 / 125);
const UZ_RECT = {
  x: 24 * (20 / 250),
  y: (UZ_BLUE_STRIPE_H - 16 * (30 / 125)) / 2,
  w: 24 * (75 / 250),
  h: 16 * (30 / 125),
};
/** Star columns start past the crescent's right edge (`UZ_RECT.x + 2 × radius`, radius = `UZ_RECT.h / 2`). */
const UZ_STAR_ROWS = [3, 4, 5];
const UZ_STARS: Array<[number, number]> = UZ_STAR_ROWS.flatMap((count, row) => {
  const y = UZ_RECT.y + 0.85 + row * ((UZ_RECT.h - 1) / 2);
  const clearCrescent = UZ_RECT.h + 0.15;
  const step = (UZ_RECT.w - clearCrescent - 0.3) / (count + 1);
  return Array.from({ length: count }, (_, i): [number, number] => [
    UZ_RECT.x + clearCrescent + step * (i + 1),
    y,
  ]);
});

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
  /**
   * The People's Republic of China — a plain red field and the five stars, at the
   * construction described above `CN_SCALE`. Nothing here is simplified away: the
   * count, the sizes, the grid positions and each small star's rotation towards
   * the large one are all the published geometry.
   */
  zh: (
    <>
      <rect width={24} height={16} fill={CN_RED} />
      <CnStar cx={CN_BIG[0] * CN_SCALE} cy={CN_BIG[1] * CN_SCALE} r={3 * CN_SCALE} />
      {CN_SMALL.map(([x, y]) => (
        <CnStar
          key={`${x}-${y}`}
          cx={x * CN_SCALE}
          cy={y * CN_SCALE}
          r={CN_SCALE}
          rotate={(Math.atan2(CN_BIG[1] - y, CN_BIG[0] - x) * 180) / Math.PI + 90}
        />
      ))}
    </>
  ),
  /*
   * France, Germany and Italy are the simple case this file was waiting for:
   * three equal bands each, nothing to simplify and nothing to get wrong beyond
   * the order of the colours and which way the bands run. France and Italy are
   * VERTICAL (hoist-side colour first — blue for France, green for Italy) and
   * Germany is HORIZONTAL, black at the top.
   *
   * France's naval ensign does use unequal 30:33:37 bands, so that the stripes
   * look even when the flag is flapping. It is not this flag: the land flag has
   * been equal thirds since 1853, and the app is not a ship.
   */
  fr: (
    <>
      <rect width={8} height={16} fill={FR_BLUE} />
      <rect x={8} width={8} height={16} fill="#fff" />
      <rect x={16} width={8} height={16} fill={FR_RED} />
    </>
  ),
  de: (
    <>
      <rect width={24} height={5.34} fill="#000" />
      <rect y={5.33} width={24} height={5.34} fill={DE_RED} />
      <rect y={10.66} width={24} height={5.34} fill={DE_GOLD} />
    </>
  ),
  it: (
    <>
      <rect width={8} height={16} fill={IT_GREEN} />
      <rect x={8} width={8} height={16} fill={IT_WHITE} />
      <rect x={16} width={8} height={16} fill={IT_RED} />
    </>
  ),
  /**
   * Turkey — the crescent and star at the legal construction described above
   * `TR_SCALE`, which this 24 × 16 box happens to fit exactly.
   *
   * The crescent is a white disc with a red disc bitten out of it, the same
   * technique the Azerbaijani flag above uses — and the two are worth comparing,
   * because they are genuinely different flags rather than variations: Turkey's
   * bite is offset by 1/16 of the flag's height and its star has FIVE points
   * turned to face the crescent, Azerbaijan's is offset differently and its star
   * has EIGHT. The star is drawn after the bite, so where it reaches into the
   * crescent's opening it is white on red, exactly as the flag is.
   */
  tr: (
    <>
      <rect width={24} height={16} fill={TR_RED} />
      <circle
        cx={TR_CRESCENT_OUTER.cx * TR_SCALE}
        cy={8}
        r={TR_CRESCENT_OUTER.r * TR_SCALE}
        fill="#fff"
      />
      <circle
        cx={TR_CRESCENT_INNER.cx * TR_SCALE}
        cy={8}
        r={TR_CRESCENT_INNER.r * TR_SCALE}
        fill={TR_RED}
      />
      <polygon
        points={pentagramPoints(TR_STAR.cx * TR_SCALE, 8, TR_STAR.r * TR_SCALE, TR_STAR.rotate)}
        fill="#fff"
      />
    </>
  ),
  /**
   * Portugal — the one flag in this file with a coat of arms, and the most
   * simplified of the six added in this batch as a result. The bands (2:5
   * green to red, hoist to fly) and the armillary sphere/shield/quinas'
   * relative sizes are the real 1911 construction; the sphere's rings and the
   * seven castles are reduced to their recognizable shapes (see `shieldPath`,
   * `Quina` and `Castle`) rather than fully detailed, for the reason Georgia's
   * crosses became plain bars: an accurate 3-towered castle or a six-arc
   * sphere is not a shape this canvas can hold at a size anyone can see.
   */
  pt: (
    <>
      <rect width={9.6} height={16} fill={PT_GREEN} />
      <rect x={9.6} width={14.4} height={16} fill={PT_RED} />
      <g stroke={PT_GOLD} strokeWidth={0.18} fill="none">
        <circle cx={9.6} cy={8} r={4} />
        <ellipse cx={9.6} cy={8} rx={4} ry={1.1} />
        <ellipse cx={9.6} cy={8} rx={1.4} ry={4} />
        <ellipse cx={9.6} cy={8} rx={4} ry={1.1} transform="rotate(55 9.6 8)" />
      </g>
      <g transform="translate(7.2 5.2)">
        <path d={shieldPath(4.8, 5.6)} fill={PT_RED} stroke="#fff" strokeWidth={0.3} />
        <path d={shieldPath(3.456, 4.032)} transform="translate(0.672 0.784)" fill="#fff" />
        <Castle cx={0.5} cy={0.5} />
        <Castle cx={2.4} cy={0.2} />
        <Castle cx={4.3} cy={0.5} />
        <Castle cx={0.25} cy={2.9} />
        <Castle cx={4.55} cy={2.9} />
        <Castle cx={0.85} cy={4.7} />
        <Castle cx={3.95} cy={4.7} />
        <Quina cx={2.4} cy={1.65} s={0.85} />
        <Quina cx={1.35} cy={2.9} s={0.85} />
        <Quina cx={2.4} cy={2.9} s={0.85} />
        <Quina cx={3.45} cy={2.9} s={0.85} />
        <Quina cx={2.4} cy={4.15} s={0.85} />
      </g>
    </>
  ),
  /** Poland — the civil flag, plain white over red, same simplification Spain's civil ensign already made in this file. */
  pl: (
    <>
      <rect width={24} height={8} fill="#fff" />
      <rect y={8} width={24} height={8} fill={PL_RED} />
    </>
  ),
  /** Hungary — equal red/white/green thirds, no coat of arms (the state flag's, not the civil flag's). */
  hu: (
    <>
      <rect width={24} height={16 / 3} fill={HU_RED} />
      <rect y={16 / 3} width={24} height={16 / 3} fill="#fff" />
      <rect y={32 / 3} width={24} height={16 / 3} fill={HU_GREEN} />
    </>
  ),
  /**
   * Greece — nine stripes and a canton cross built entirely from `EL_STRIPE`
   * (see above), so the proportions are the law's, not eyeballed.
   */
  el: (
    <>
      {Array.from({ length: 9 }, (_, i) => (
        <rect
          key={i}
          y={i * EL_STRIPE}
          width={24}
          height={EL_STRIPE}
          fill={i % 2 === 0 ? EL_BLUE : '#fff'}
        />
      ))}
      <rect width={EL_CANTON} height={EL_CANTON} fill={EL_BLUE} />
      <rect x={EL_CANTON / 2 - EL_STRIPE / 2} width={EL_STRIPE} height={EL_CANTON} fill="#fff" />
      <rect y={EL_CANTON / 2 - EL_STRIPE / 2} width={EL_CANTON} height={EL_STRIPE} fill="#fff" />
    </>
  ),
  /**
   * Kazakhstan — turquoise field, the sun's 32 rays computed like the US's 50
   * stars, a simplified soaring-eagle silhouette (`KZ_EAGLE_PATH`) beneath it,
   * and a hoist ornament that stands in for the koshkar-muiz (ram's-horn)
   * motif with a plain repeating diamond rather than the traditional geometry
   * — the one piece of this flag that is a genuine simplification rather than
   * a reduction of real published geometry, and said so plainly rather than
   * left for someone to notice.
   */
  kk: (
    <>
      <rect width={24} height={16} fill={KZ_BLUE} />
      <rect width={3.5} height={16} fill={KZ_GOLD} />
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x={1.2}
          y={0.45 + i * 2}
          width={1.1}
          height={1.1}
          fill={KZ_BLUE}
          transform={`rotate(45 1.75 ${1 + i * 2})`}
        />
      ))}
      {Array.from({ length: KZ_RAY_COUNT }, (_, i) => (
        <polygon
          key={i}
          points={sunRayPoints(13.5, 5, 1.3, 3.1, (360 / KZ_RAY_COUNT) * i)}
          fill={KZ_GOLD}
        />
      ))}
      <circle cx={13.5} cy={5} r={1.4} fill={KZ_GOLD} />
      <g transform="translate(13.5 10) scale(0.95)">
        <path d={KZ_EAGLE_PATH} fill={KZ_GOLD} />
      </g>
    </>
  ),
  /**
   * Uzbekistan — the stripes and the crescent-and-stars rectangle both come
   * straight from the flag's own construction sheet (see `UZ_RECT` above);
   * the crescent opens toward the fly using the same white-disc-minus-a-bite
   * technique as Azerbaijan and Turkey elsewhere in this file, just with the
   * field's own blue standing in for the bite instead of a border colour.
   */
  uz: (
    <>
      <rect width={24} height={UZ_BLUE_STRIPE_H} fill={UZ_BLUE} />
      <rect y={UZ_BLUE_STRIPE_H} width={24} height={0.32} fill={UZ_RED} />
      <rect y={UZ_BLUE_STRIPE_H + 0.32} width={24} height={5.12} fill="#fff" />
      <rect y={UZ_BLUE_STRIPE_H + 5.44} width={24} height={0.32} fill={UZ_RED} />
      <rect y={UZ_BLUE_STRIPE_H + 5.76} width={24} height={5.12} fill={UZ_GREEN} />
      <circle
        cx={UZ_RECT.x + UZ_RECT.h / 2}
        cy={UZ_RECT.y + UZ_RECT.h / 2}
        r={UZ_RECT.h / 2}
        fill="#fff"
      />
      <circle
        cx={UZ_RECT.x + UZ_RECT.h / 2 + 0.75}
        cy={UZ_RECT.y + UZ_RECT.h / 2}
        r={UZ_RECT.h / 2 - 0.32}
        fill={UZ_BLUE}
      />
      {UZ_STARS.map(([x, y]) => (
        <polygon key={`${x}-${y}`} points={pentagramPoints(x, y, 0.42)} fill="#fff" />
      ))}
    </>
  ),
  /**
   * Japan — the simplest flag in this file and the one with the least room to be
   * wrong, because it is nothing but a proportion: get the disc's size or its
   * position off and it stops being the Hinomaru. Both numbers are the law's
   * (see `JP_DISC_R`), and at 2:3 the flag's own ratio IS this viewBox.
   */
  ja: (
    <>
      <rect width={24} height={16} fill="#fff" />
      <circle cx={12} cy={8} r={JP_DISC_R} fill={JP_RED} />
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
