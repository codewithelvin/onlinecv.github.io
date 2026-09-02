import type { JSX, ReactNode } from 'react';
import { Alert, Typography } from 'antd';
import type { Locale } from '../../types/resume';
import { fillCounts } from './counts';
import { parseInline } from './inline';
import { HELP_SHOT_SIZE, helpShotUrl } from './shots';
import type { HelpBlock } from './types';

/**
 * The in-app half of the guide renderer (spec §10.4).
 *
 * Its twin is `src/app/help-page.ts`, which turns the SAME blocks into standalone
 * HTML for `/az/help`. Both switch exhaustively over `HelpBlock`, so a new block
 * kind is a compile error in both files rather than a silent omission in one — that
 * is the entire reason the content is a typed union and not a string of markup.
 */

/** `**bold**` → `<strong>`. See `./inline` for why that is the whole vocabulary. */
function Inline({ text }: { text: string }): JSX.Element {
  return (
    <>
      {parseInline(fillCounts(text)).map((run, i) =>
        run.bold ? <strong key={i}>{run.text}</strong> : <span key={i}>{run.text}</span>,
      )}
    </>
  );
}

/**
 * A screenshot, in the reader's own language.
 *
 * The caption is the `alt` text and the visible `<figcaption>` is hidden from
 * assistive technology, rather than the other way round. Both carry the same
 * sentence, and announcing it twice is worse than announcing it once — this way a
 * screen reader gets it from the image (where it explains what is missing) and a
 * sighted reader gets it from the caption.
 *
 * `width`/`height` come from `HELP_SHOT_SIZE`, the table the capture script clips
 * to, so the box is reserved before the file arrives and the article does not
 * reflow under the reader as each image loads.
 */
function Shot({
  id,
  caption,
  locale,
  base,
}: {
  id: keyof typeof HELP_SHOT_SIZE;
  caption: string;
  locale: Locale;
  base: string;
}): JSX.Element {
  const size = HELP_SHOT_SIZE[id];
  return (
    <figure style={{ margin: '20px 0' }}>
      <img
        src={helpShotUrl(base, locale, id)}
        alt={fillCounts(caption)}
        width={size.width}
        height={size.height}
        loading="lazy"
        decoding="async"
        style={{
          display: 'block',
          maxWidth: '100%',
          height: 'auto',
          borderRadius: 8,
          border: '1px solid #f0f0f0',
          background: '#fafafa',
        }}
      />
      <Typography.Text
        // Hidden from assistive tech because the image's alt says the same thing.
        aria-hidden
        type="secondary"
        style={{ display: 'block', marginTop: 8, fontSize: 13, lineHeight: 1.5 }}
      >
        {fillCounts(caption)}
      </Typography.Text>
    </figure>
  );
}

/** One block. Exhaustive over `HelpBlock` — see the note at the top of the file. */
function Block({
  block,
  locale,
  base,
}: {
  block: HelpBlock;
  locale: Locale;
  base: string;
}): ReactNode {
  switch (block.kind) {
    case 'p':
      return (
        <Typography.Paragraph style={{ marginBottom: 12 }}>
          <Inline text={block.text} />
        </Typography.Paragraph>
      );
    case 'h':
      return (
        <Typography.Title level={4} style={{ marginTop: 28, marginBottom: 10, fontSize: 16 }}>
          <Inline text={block.text} />
        </Typography.Title>
      );
    case 'ul':
      return (
        <ul style={{ margin: '0 0 12px', paddingInlineStart: 22, lineHeight: 1.7 }}>
          {block.items.map((item, i) => (
            <li key={i}>
              <Inline text={item} />
            </li>
          ))}
        </ul>
      );
    case 'steps':
      return (
        <ol style={{ margin: '0 0 12px', paddingInlineStart: 22, lineHeight: 1.7 }}>
          {block.items.map((item, i) => (
            <li key={i}>
              <Inline text={item} />
            </li>
          ))}
        </ol>
      );
    case 'dl':
      return (
        <dl style={{ margin: '0 0 12px' }}>
          {block.items.map((item, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <dt style={{ fontWeight: 600, lineHeight: 1.5 }}>
                <Inline text={item.term} />
              </dt>
              {/* `marginInlineStart`, not `marginLeft`: the indent has to move to
                  the right-hand side in Arabic and Hebrew. */}
              <dd style={{ margin: '2px 0 0', marginInlineStart: 0, lineHeight: 1.7 }}>
                <Inline text={item.def} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case 'note':
      return (
        <Alert
          type="info"
          showIcon
          style={{ margin: '12px 0' }}
          message={<Inline text={block.text} />}
        />
      );
    case 'warn':
      return (
        <Alert
          type="warning"
          showIcon
          style={{ margin: '12px 0' }}
          message={<Inline text={block.text} />}
        />
      );
    case 'shot':
      return <Shot id={block.id} caption={block.caption} locale={locale} base={base} />;
  }
}

/** Render a topic's blocks. */
export function HelpBlocks({
  blocks,
  locale,
  base,
}: {
  blocks: HelpBlock[];
  locale: Locale;
  base: string;
}): JSX.Element {
  return (
    <>
      {blocks.map((block, i) => (
        <Block key={i} block={block} locale={locale} base={base} />
      ))}
    </>
  );
}
