# Adding a CV template

Templates are **add-only**: a new one is a new folder under `src/templates/<id>/` and nothing in
`src/templates/_core/` is edited to make it appear. The registry finds it with `import.meta.glob`.

## The five files

```
src/templates/<id>/
  index.tsx       default export: (props: TemplateProps) => JSX.Element
  styles.ts       export const styles: Record<string, CSSProperties>
  theme.ts        export const <id>Theme = { … }   — colours only
  manifest.ts     export const manifest: TemplateManifest
  thumbnail.jpg   GENERATED — see below, never hand-made
```

`manifest.id` **must equal the folder name** (the registry derives one from the other).

## Rules that are not obvious

1. **One HTML source drives the live preview AND the exported PDF.** Stay inside the
   `react-pdf-html` CSS subset: flexbox, colours, borders, fonts. **No** grid, floats, gradients,
   transforms, media queries, or `position: absolute` inside the template. If the source design you
   are adapting uses those — and print résumé CSS usually does — rebuild the effect out of flex
   boxes. A vertical rule with a dot on it is a flex column of three boxes, not two positioned
   pseudo-elements; a margin gutter is a two-cell row, not a float with a negative margin.

2. **Never `text-transform` the user's own words.** Legal on strings the app owns (section titles,
   field labels); never on the name, headline, company, institution, skill… Two failures, both
   real: the PDF's text layer carries the TRANSFORMED string, so an ATS reads back a name nobody
   typed; and `toUpperCase()` on Georgian maps Mkhedruli to Mtavruli, which is a misspelling.
   `templates.test.tsx` fails the build if you do it.

3. **Never use `<ul>`/`<li>`.** react-pdf paints the marker at the row origin, on top of the text,
   even with the marker box hidden. Use `BulletList` from `_core/bullets`.

4. **A flex row with `justify-content: space-between` needs ≥2 BLOCK children.** `react-pdf-html`
   buckets consecutive inline elements into one `Text`, so `<span>`s collapse into a single child
   and the date ends up running straight after the title. Inline `<span>`s are fine inside a
   sentence — just not as the items of a spacing row.

5. **Dates come from the tokens, not from a literal.** Import `DATE_FULL` / `DATE_MONTH_YEAR` from
   `_core/render-helpers` and pass them to `formatDate`. They are resolved per language, so
   `'MMM YYYY'` written out by hand silently opts your template out of the Korean and Chinese date
   order. `DATE_FULL` = experience + date of birth, `DATE_MONTH_YEAR` = education + certificates.

6. **Vertical breathing room goes in `manifest.pageMargin`, not in the root's padding.** Padding
   applies to a block once, so on a two-page CV every page after the first starts hard against the
   paper edge.

7. **A full-height colour column goes in `manifest.pageBleed`, not in the markup.** It has to reach
   the paper edges and repeat on every page; core paints it at page level in both targets. Its
   `width` must match the sidebar's width in `styles.ts`, and the root must carry no horizontal
   padding. If you want a band that appears on page ONE only (a masthead), it is an ordinary flow
   element instead — a bleed would reprint it on page 2.

8. **Right-to-left is explicit.** react-pdf never sets Yoga's direction, so nothing mirrors on its
   own. Wrap rows in `mirrorRow`, and use `mirrorInlineEndPadding` / `mirrorTextAlign` wherever a
   style points at one side. For an inline-START property (a `paddingLeft`, a `borderLeft`, a chip's
   `marginRight`) pick the side yourself from `isRtl(locale)`.

9. **Only Inter 400/500/600/700 are registered.** Ask for 300 or 800 and @react-pdf silently gives
   you the nearest, while your `styles.ts` tells the next reader a lighter face exists.

10. **No `fontFamily` and no opaque `backgroundColor` on the template root.** Core sets the font
    stack ordered by the CV's language; an opaque root hides the page-bleed layer.

11. **`atsSafe: true` means single column, image-free, real text.** Two columns, a photo or a filled
    band → `false`. Be honest; `classic` and `compact` are the ATS answer.

12. **A section renders nothing when it has no content** (BR-5). `Section` decides from whether it
    was handed children, so resolve emptiness BEFORE the JSX — a child component that returns
    `null` is still a truthy child, and you get a heading over an empty section.

13. **Contacts go through `ContactList`/`ContactValue`, and they need two more props than the link
    style.** `textSize` is the font size of the CONTACT TEXT, not of the mark: core derives the
    mark's height from it (cap height), which is the whole reason a channel icon reads as
    vertically centred on the line. Export the size as a constant from your `styles.ts` and use it
    in both places — `styles` is typed `Record<string, CSSProperties>`, so reading `fontSize` back
    out of it recovers `string | number | undefined`. `iconTone` is `dark` (default, for contacts
    on paper) or `light` (white marks, for contacts on a filled band or sidebar — `banner` and
    `modern`). Never draw the mark yourself: an `<img>` or `<svg>` beside a contact value makes
    `react-pdf-html` treat it as BLOCK content and the exported contact line comes apart into
    stacked fragments.

## Naming

`manifest.name` is a `LocalizedText`; only `az` is required, but ship all 19 — the picker shows the
raw fallback otherwise. Keep the id, the folder and the English display name the same word.

## Thumbnail

Never hand-made. It is the only part of the folder not derived from the code, so it is the only
part that can silently stop matching it:

```
npx vite-node scripts/make-thumbnails.ts -- <id>     # one
npx vite-node scripts/make-thumbnails.ts             # all of them
```

It renders the real component on a rebuilt `A4Frame` (595×842 pt, your `pageMargin`/`pageBleed`,
the CV-language font order) and captures the top 468 pt at 1.452× → 864×680.

## Before you call it done

`tsc -b` · `eslint .` · `prettier --check .` · `vitest run` · `vite build` — all five.

The suite already covers a new template automatically, because every template test is driven by
`listTemplates()`: smoke render, heading/first-block `keep-together` binding, no list elements, no
`data-page-bleed`, no text-transformed user content, real-PDF geometry and pagination, and
**text fidelity in all 18 exportable locales**. If you added one and the suite is green, the
template works in every language the app ships.

Then look at it in the real app — `npm run build && npm run preview` — because jsdom does no layout.
