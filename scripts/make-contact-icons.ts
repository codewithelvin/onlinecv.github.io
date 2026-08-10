/**
 * Regenerate the contact-channel icons in `src/templates/_core/icons/`.
 *
 *   npx vite-node scripts/make-contact-icons.ts [type…]
 *
 * WHY THEY ARE RASTER, AND WHY THEY ARE GENERATED.
 *
 * A CV prints a mobile number, a landline, a WhatsApp number and a Telegram
 * number as four strings that look identical, so the channel has to be shown
 * rather than inferred. The icon has to reach BOTH targets — the live HTML
 * preview and the exported PDF — from one declaration, and in the PDF that
 * leaves exactly one option: `@react-pdf` draws an inline `Image` inside a text
 * run (a `Svg` child of a `Text` is dropped on the floor), and its image decoder
 * reads PNG and JPEG only. Hence PNG, and hence a build step: the artwork is
 * Bootstrap Icons (MIT), rendered through `react-icons` — already a dependency —
 * so nobody hand-draws a brand mark and the set can be re-rendered at a
 * different size or tone by editing this file.
 *
 * TWO TONES, BOTH ACHIEVED WITH ALPHA. A PNG cannot be tinted at draw time, and
 * the six templates print their contacts in six different colours — from
 * `#4a4a4a` on white to `#cfe6d9` on a green band. Rather than one file per
 * colour, `dark` is black at 70% and `light` is white at 82%, so each icon takes
 * on whatever it is laid over: the light tone comes out `#d8ecdf` on the banner's
 * green and `#d9e7fb` on the modern sidebar's blue, which is within a shade of
 * both templates' own muted text colours. That is why the capture must keep its
 * alpha channel (`transparent: true`).
 *
 * SIZE. Rendered at 48px for an icon drawn at 7–8.5pt, i.e. ~6× — enough to stay
 * clean at the 300–400% zoom a recruiter reads a PDF at, while keeping each file
 * under a kilobyte or so. They are inlined as data URIs at build time
 * (`import.meta.glob(… ?inline)` in `_core/contact-icons.ts`), so an export needs
 * no network and works offline.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { IconType } from 'react-icons';
import {
  TbBrandFacebook,
  TbBrandGithub,
  TbBrandInstagram,
  TbBrandLinkedin,
  TbBrandSkype,
  TbBrandTelegram,
  TbBrandWhatsapp,
  TbBrandX,
  TbDeviceMobile,
  TbMail,
  TbMapPin,
  TbPhone,
  TbPrinter,
  TbWorld,
} from 'react-icons/tb';
import type { ContactType } from '../src/types/resume';
import { CONTACT_ICON_TONES } from '../src/templates/_core/contact-icons';
import { capture } from './capture';

const OUT_DIR = resolve(import.meta.dirname, '../src/templates/_core/icons');
/** Rendered pixels per side. See "SIZE" above. */
const PX = 48;

/**
 * One mark per channel, all from ONE family — Tabler Icons (MIT), via
 * `react-icons`.
 *
 * OUTLINE, NOT FILLED, and that is the reason this family was chosen over the
 * obvious ones. A solid glyph puts a block of near-black ink beside a phone
 * number and reads as a heavy dot on an otherwise typographic page; the first cut
 * of these was filled and it was too dark. Most icon sets only ship their BRAND
 * marks solid (Bootstrap, Font Awesome and Simple Icons all do), which would have
 * left a row mixing hairline generics with heavy logos. Tabler draws everything —
 * including WhatsApp, Telegram and Skype — as a 24-grid stroke, so the whole set
 * carries the same weight.
 *
 * Total over `ContactType`, so widening that union makes `tsc` name the channel
 * that still needs a mark rather than letting it ship blank.
 */
const MARKS: Record<ContactType, IconType> = {
  mobile: TbDeviceMobile,
  landline: TbPhone,
  fax: TbPrinter,
  email: TbMail,
  address: TbMapPin,
  website: TbWorld,
  whatsapp: TbBrandWhatsapp,
  telegram: TbBrandTelegram,
  skype: TbBrandSkype,
  linkedin: TbBrandLinkedin,
  facebook: TbBrandFacebook,
  github: TbBrandGithub,
  instagram: TbBrandInstagram,
  x: TbBrandX,
};

/**
 * Stroke width on Tabler's 24-unit grid, overriding its default 2.
 *
 * The marks are drawn at 7pt beside 9pt text, so the default weight lands
 * noticeably heavier than the type it sits next to; 1.6 puts the stroke at about
 * the same optical weight as Inter's stems at that size. Tabler's components take
 * it as a prop because the value lives on the `<svg>` and the paths inherit it.
 */
const STROKE = 1.6;

/** A complete page holding one mark, sized to fill the capture viewport. */
function page(icon: IconType, color: string): string {
  const svg = renderToStaticMarkup(createElement(icon, { strokeWidth: STROKE }));
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:transparent}
  body{width:${PX}px;height:${PX}px;display:flex;align-items:center;justify-content:center;color:${color}}
  svg{display:block;width:${PX}px;height:${PX}px}
</style></head><body>${svg}</body></html>`;
}

async function main(): Promise<void> {
  const asked = process.argv.slice(2);
  const types = (Object.keys(MARKS) as ContactType[]).filter(
    (type) => asked.length === 0 || asked.includes(type),
  );
  const unknown = asked.filter((a) => !(a in MARKS));
  if (unknown.length > 0) throw new Error(`unknown contact type(s): ${unknown.join(', ')}`);

  mkdirSync(OUT_DIR, { recursive: true });
  const jobs = types.flatMap((type) =>
    Object.entries(CONTACT_ICON_TONES).map(([tone, color]) => ({
      html: page(MARKS[type], color),
      out: join(OUT_DIR, `${type}-${tone}.png`),
      width: PX,
      height: PX,
      format: 'png' as const,
      transparent: true,
    })),
  );

  await capture(jobs);

  const total = readdirSync(OUT_DIR)
    .filter((f) => f.endsWith('.png'))
    .reduce((sum, f) => sum + statSync(join(OUT_DIR, f)).size, 0);
  console.log(`\n${jobs.length} icon(s) written — ${OUT_DIR}`);
  console.log(`set total: ${(total / 1024).toFixed(1)} KB on disk`);
}

await main();
