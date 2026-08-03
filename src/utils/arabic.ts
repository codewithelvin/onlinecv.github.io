/**
 * Arabic script support for the EXPORT path.
 *
 * Two separate jobs, both display-only: joining the letters (`preshapeArabic`)
 * and Arabic-Indic numerals (`toArabicDigits`). Neither ever touches stored
 * data — `Resume` keeps plain Arabic letters and ISO dates in Western digits.
 */

/* ------------------------------------------------------------------ joining */

/**
 * WHY THIS EXISTS.
 *
 * `@react-pdf` lays a right-to-left line out in the wrong order: its bidi pass
 * reorders the string into VISUAL order first, and only then does pdfkit call
 * fontkit — with `direction: 'ltr'` forced, so it will not reorder again. The
 * shaper therefore reads Arabic backwards and picks the wrong contextual form
 * for nearly every letter (measured on `مرحبا`: initial where final belongs,
 * medial where initial belongs), while the mandatory lam-alef ligature never
 * matches at all. `docs/adding-a-language.md` has the full measurement.
 *
 * The fix is to do the joining ourselves and hand the engine characters whose
 * shape is already fixed: the Unicode Arabic Presentation Forms (U+FB50–FBFF,
 * U+FE70–FEFF), where every letter has a separate code point per position. Being
 * reordered no longer changes how they look.
 *
 * The tables are DERIVED, not typed out: every presentation character
 * NFKC-normalizes back to its base letter, and the blocks list a letter's forms
 * in a fixed order — 4 code points for a dual-joining letter
 * (isolated/final/initial/medial), 2 for a right-joining one (isolated/final).
 * So the joining classes and the form tables both fall out of data the JS engine
 * already ships, and a letter cannot be missed or mistyped.
 */

const ISOLATED = 0;
const FINAL = 1;
const INITIAL = 2;
const MEDIAL = 3;

/**
 * Zero-width non-joiner — see `withNonJoiners` for what it is doing here.
 * Escaped rather than written literally: it is invisible in an editor, and so
 * are several of the code points below.
 */
export const ZWNJ = '\u200C';

/** Marks and format characters: invisible to the joining algorithm. */
const TRANSPARENT = /\p{Mn}|\p{Me}|\p{Cf}/u;

/** Any Arabic-script code point, including the two presentation blocks. */
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

interface Tables {
  /** Base letter → its presentation forms, in `[isolated, final, initial, medial]` order. */
  letters: Map<string, string[]>;
  /** "lam + alef" → its two ligature forms. */
  ligatures: Map<string, string[]>;
  /** Every presentation character, for the non-joiner pass. */
  presentation: Set<string>;
}

function buildTables(): Tables {
  const letters = new Map<string, string[]>();
  const ligatures = new Map<string, string[]>();
  let group: { base: string; forms: string[] } | null = null;

  for (const [from, to] of [
    [0xfb50, 0xfbff],
    [0xfe70, 0xfeff],
  ]) {
    for (let cp = from; cp <= to; cp += 1) {
      const ch = String.fromCodePoint(cp);
      const base = ch.normalize('NFKC');
      // Unassigned, or a character that is its own base: ends the current run.
      if (base === ch) {
        group = null;
        continue;
      }
      if (!group || group.base !== base) {
        group = { base, forms: [] };
        if (base.length === 1) letters.set(base, group.forms);
        // Only lam + alef. The blocks also hold optional typographic ligatures
        // and space/tatweel carriers for the diacritics; forcing those would be
        // rewriting the text rather than shaping it.
        else if (base.length === 2 && base[0] === 'ل') ligatures.set(base, group.forms);
        else group = { base, forms: [] };
      }
      group.forms.push(ch);
    }
  }

  const presentation = new Set([...letters.values(), ...ligatures.values()].flat());
  return { letters, ligatures, presentation };
}

const { letters, ligatures, presentation } = buildTables();

/** Dual-joining: 4 forms means the letter connects to the one after it. */
const joinsForward = (ch: string): boolean => letters.get(ch)?.length === 4;
/** Right-joining or dual-joining: it connects to the letter before it. */
const joinsBackward = (ch: string): boolean => (letters.get(ch)?.length ?? 0) >= 2;

/** The four alef forms — the left half of the only ligature that misfires. */
const ALEFS = new Set(['ا', 'آ', 'أ', 'إ']);
const LAM = 'ل';

/**
 * One zero-width non-joiner, only where the engine would otherwise invent a
 * ligature that the text does not contain.
 *
 * Pre-shaping fixes the letter FORMS but the engine still runs its own OpenType
 * layout over the result, on the reversed line. Almost everything survives that
 * — a presentation form has no context left to lose — with exactly one
 * exception: `rlig`. The definite article `ال` (alef then lam) reversed IS the
 * lam-alef pattern, so the shaper ligates it into `لا`. Arabic puts `ال` in
 * front of most nouns, so that is a visible error on nearly every line.
 *
 * A non-joiner between the alef and the lam breaks that one pattern and nothing
 * else. Measured against fontkit's correct RTL shaping of the same strings
 * (`NotoSansArabic-Regular`, six sample lines):
 *
 * | variant                 | spurious `rlig` | width drift        | space glyphs |
 * | ----------------------- | --------------- | ------------------ | ------------ |
 * | no non-joiner           | 2–4 per line    | 0.0 … 3.4%         | real spaces  |
 * | non-joiner between ALL  | 0               | 0.0 … 1.9%         | 8–21 per line|
 * | non-joiner at `ال` only | 0               | 0.0 … 0.2% (1 × 5.7%) | real spaces |
 *
 * The middle row is what this used to do, and the "space glyphs" column is why
 * it had to change: the shipped font maps U+200C to its `space` glyph, so a
 * non-joiner between every pair of letters put a space between every letter of
 * the extracted text. An Arabic CV came out of the PDF text layer as
 * "م ح م د" — which for an ATS-first product is the whole artifact broken,
 * not a cosmetic detail. Targeting the one real ligature keeps `rlig` suppressed
 * and leaves the text layer readable.
 */
function withNonJoiners(shaped: string[]): string {
  const out: string[] = [];
  for (let i = 0; i < shaped.length; i += 1) {
    const current = shaped[i];
    const next = shaped[i + 1];
    out.push(current);
    if (
      next !== undefined &&
      presentation.has(current) &&
      ALEFS.has(current.normalize('NFKC')) &&
      next.normalize('NFKC') === LAM
    ) {
      out.push(ZWNJ);
    }
  }
  return out.join('');
}

/**
 * Join Arabic text into presentation forms for the PDF exporter.
 *
 * Safe on ANY string, markup included: only characters that have presentation
 * forms are touched, so ASCII (tags, attributes, URLs), Latin, Cyrillic and
 * Georgian pass through byte-identical, and a CV with no Arabic in it is
 * returned unchanged.
 */
export function preshapeArabic(text: string): string {
  if (!ARABIC.test(text)) return text;

  const chars = [...text];
  const shaped: string[] = [];

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];

    // The letter before, skipping marks: does it reach forward to this one?
    let prev = i - 1;
    while (prev >= 0 && TRANSPARENT.test(chars[prev])) prev -= 1;
    const prevJoins = prev >= 0 && joinsForward(chars[prev]);

    const ligature = i + 1 < chars.length ? ligatures.get(ch + chars[i + 1]) : undefined;
    if (ligature) {
      shaped.push(ligature[prevJoins ? FINAL : ISOLATED] ?? ligature[ISOLATED]);
      i += 1;
      continue;
    }

    const forms = letters.get(ch);
    if (!forms) {
      shaped.push(ch);
      continue;
    }

    // The letter after, likewise — and this one has to reach forward itself.
    let next = i + 1;
    while (next < chars.length && TRANSPARENT.test(chars[next])) next += 1;
    const nextJoins = next < chars.length && joinsBackward(chars[next]) && joinsForward(ch);

    let form = ISOLATED;
    if (prevJoins && nextJoins) form = MEDIAL;
    else if (prevJoins) form = FINAL;
    else if (nextJoins) form = INITIAL;

    // A right-joining letter has no initial/medial form: it falls back to the
    // isolated one, which is what "not connected on the left" looks like.
    shaped.push(forms[form] ?? forms[ISOLATED]);
  }

  return withNonJoiners(shaped);
}

/* ------------------------------------------------------------------- digits */

const ARABIC_INDIC = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Western digits → Arabic-Indic (`2026` → `٢٠٢٦`), for DISPLAY only.
 *
 * Never applied to anything that gets stored: `Resume` dates stay ISO
 * (`utils/date` neutralizes dayjs's own digit rewriting for exactly that
 * reason), and this runs on the already-formatted output instead.
 */
export function toArabicDigits(text: string): string {
  return text.replace(/[0-9]/g, (digit) => ARABIC_INDIC[Number(digit)]);
}
