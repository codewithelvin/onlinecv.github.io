/**
 * Read the TEXT back out of a generated PDF, per font, so a test can compare what
 * was DRAWN against what went in.
 *
 * WHY THIS EXISTS. Every Arabic assertion in this repo used to check a proxy —
 * fonts embedded, no `Helvetica`, no two runs at one position, page count, column
 * geometry — and a full green suite reported success while a real export came out
 * with letters missing (`العملية` → `العملي`) and Latin glyphs substituted into
 * Arabic words (`مطورĂاجهات`). None of those checks could see it, because none of
 * them looked at the characters. This does.
 *
 * It is also the reader an ATS is: the same `/ToUnicode` tables, resolved the same
 * way. If a word cannot be recovered here, it cannot be recovered by a parser
 * either.
 */

/** `N 0 obj … endobj` bodies, by object number. */
function objects(pdf: string): Map<number, string> {
  const map = new Map<number, string>();
  for (const match of pdf.matchAll(/(\d+) 0 obj([\s\S]*?)endobj/g)) {
    map.set(Number(match[1]), match[2]);
  }
  return map;
}

/**
 * Glyph-id → text, per PDF font resource name (`F1`, `F2`, …).
 *
 * Built per FONT, deliberately: a merged table is worthless because subset glyph
 * ids are only meaningful inside their own font, and merging them silently
 * decodes one font's glyphs with another font's table.
 */
function toUnicodeByFont(pdf: string): Map<string, Map<string, string>> {
  const objs = objects(pdf);
  const perFont = new Map<string, Map<string, string>>();

  for (const resources of pdf.matchAll(/\/Font\s*<<([^>]*)>>/g)) {
    for (const ref of resources[1].matchAll(/\/(F\d+)\s+(\d+)\s+0\s+R/g)) {
      const [, name, fontObj] = ref;
      if (perFont.has(name)) continue;
      const font = objs.get(Number(fontObj)) ?? '';
      const cmapRef = font.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
      if (!cmapRef) continue;
      const cmap = objs.get(Number(cmapRef[1])) ?? '';

      const table = new Map<string, string>();
      const hexToText = (hex: string): string =>
        (hex.match(/.{4}/g) ?? []).map((unit) => String.fromCharCode(parseInt(unit, 16))).join('');

      for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
        for (const pair of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
          table.set(pair[1].toLowerCase(), hexToText(pair[2]));
        }
      }
      // Ranges: `<lo> <hi> <startDst>` maps each id in [lo,hi] consecutively.
      for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
        for (const row of block[1].matchAll(
          /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g,
        )) {
          const lo = parseInt(row[1], 16);
          const hi = parseInt(row[2], 16);
          const dst = parseInt(row[3], 16);
          for (let id = lo; id <= hi && id - lo < 0x10000; id += 1) {
            table.set(id.toString(16).padStart(4, '0'), String.fromCharCode(dst + (id - lo)));
          }
        }
      }
      perFont.set(name, table);
    }
  }
  return perFont;
}

export interface PdfTextRun {
  /** Decoded text of the run. */
  text: string;
  /** Absolute position on the page, in points. */
  x: number;
  y: number;
  /** The PDF font resource that drew it. */
  font: string;
  /** Glyph ids the decoder could not map (empty when all resolved). */
  unmapped: string[];
}

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const SIX = String.raw`(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)`;

const concat = (i: Matrix, o: Matrix): Matrix => [
  i[0] * o[0] + i[1] * o[2],
  i[0] * o[1] + i[1] * o[3],
  i[2] * o[0] + i[3] * o[2],
  i[2] * o[1] + i[3] * o[3],
  i[4] * o[0] + i[5] * o[2] + o[4],
  i[4] * o[1] + i[5] * o[3] + o[5],
];

/** Every text run in the file, decoded, in paint order. */
export function pdfTextRuns(pdf: string): PdfTextRun[] {
  const tables = toUnicodeByFont(pdf);
  const runs: PdfTextRun[] = [];
  const stack: Matrix[] = [];
  let ctm: Matrix = IDENTITY;
  let textMatrix: Matrix = IDENTITY;
  let font = '';

  for (const raw of pdf.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === 'q') {
      stack.push(ctm);
      continue;
    }
    if (line === 'Q') {
      ctm = stack.pop() ?? IDENTITY;
      continue;
    }
    const cm = line.match(new RegExp(`^${SIX} cm$`));
    if (cm) ctm = concat(cm.slice(1).map(Number) as Matrix, ctm);
    const tm = line.match(new RegExp(`^${SIX} Tm$`));
    if (tm) textMatrix = tm.slice(1).map(Number) as Matrix;
    const tf = line.match(/^\/(F\d+) [\d.]+ Tf$/);
    if (tf) font = tf[1];
    if (!line.endsWith('TJ')) continue;

    const table = tables.get(font);
    const body = line.slice(line.indexOf('[') + 1, line.lastIndexOf(']'));
    let text = '';
    const unmapped: string[] = [];
    for (const hex of body.match(/<([0-9a-fA-F]*)>/g) ?? []) {
      for (const id of hex.slice(1, -1).toLowerCase().match(/.{4}/g) ?? []) {
        const glyph = table?.get(id);
        if (glyph === undefined) unmapped.push(`${font}:${id}`);
        else text += glyph;
      }
    }
    const placed = concat(textMatrix, ctm);
    runs.push({ text, x: placed[4], y: placed[5], font, unmapped });
  }
  return runs;
}

/** Zero-width joiners/non-joiners the exporter inserts for shaping. */
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;

/**
 * All text in the file as one readable string, in visual reading order.
 *
 * Presentation forms are folded back to plain letters with NFKC — the same
 * normalization a text processor applies — and the shaping non-joiners removed,
 * so the result is comparable to the text that was put in.
 */
/** Any right-to-left letter, including the Arabic presentation-forms blocks. */
const RTL = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

export function pdfPlainText(pdf: string): string {
  /**
   * Runs are grouped into LINES and concatenated with NO separator, which is what a
   * real extractor does: a run boundary is not a word boundary.
   *
   * That distinction matters more than it sounds. The exporter starts a new
   * positioned run whenever a glyph needs its own placement (kerning, mark
   * attachment) or the font changes, so a single word routinely spans several runs
   * — a Hebrew headline came out as four runs splitting `מפתח צד לקוח` mid-word,
   * and joining runs with a space reported nineteen intact words as missing. Real
   * spaces are drawn as their own space glyphs and are already inside the runs, so
   * nothing is lost by not inserting more.
   */
  const lines = new Map<number, PdfTextRun[]>();
  for (const run of pdfTextRuns(pdf)) {
    // Rounded to the point: glyphs on one baseline can differ by a hair.
    const key = Math.round(run.y);
    const line = lines.get(key);
    if (line) line.push(run);
    else lines.set(key, [run]);
  }

  const out: string[] = [];
  for (const key of [...lines.keys()].sort((a, b) => b - a)) {
    const visual = (lines.get(key) ?? [])
      .sort((a, b) => a.x - b.x)
      .map((run) => run.text)
      .join('');
    out.push(visual);
    /**
     * A right-to-left line is PAINTED in visual order, so the content stream holds
     * it last-letter-first. BOTH orders go into the haystack, because this function
     * answers "did the characters survive" and not "in what order were they
     * written": reading order in an RTL export is a separate, documented
     * limitation, and a comparison that conflated the two would report every
     * Hebrew and Arabic word missing whether or not the export was really broken.
     */
    if (RTL.test(visual)) out.push([...visual].reverse().join(''));
  }

  return out.join('\n').replace(INVISIBLE, '').normalize('NFKC');
}

/**
 * Words from `source` that do NOT appear in the PDF's text.
 *
 * Compared word-wise rather than as whole strings because line wrapping legally
 * splits a line anywhere, and a hyphenless wrap keeps words intact.
 */
export function missingWords(pdf: string, source: string): string[] {
  const haystack = pdfPlainText(pdf);
  return source
    .split(/\s+/)
    .map((word) =>
      word
        .replace(/^[(),.·—:;]+|[(),.·—:;]+$/g, '')
        .replace(INVISIBLE, '')
        .normalize('NFKC'),
    )
    .filter((word) => word.length > 1)
    .filter((word) => !haystack.includes(word));
}
