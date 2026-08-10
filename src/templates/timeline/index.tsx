import { Children, type CSSProperties, type JSX, type ReactNode } from 'react';
import type { TemplateProps } from '../_core/contract';
import type { EducationItem, ExperienceItem, LanguageLevel, Locale } from '../../types/resume';
import { BulletList } from '../_core/bullets';
import { ContactValue } from '../_core/contacts';
import {
  contactChannels,
  DATE_FULL as FULL,
  DATE_MONTH_YEAR as MONTH,
  fullName,
  generalInfoPairs,
  hasItems,
  highlights,
  KEEP_TOGETHER,
} from '../_core/render-helpers';
import { isRtl, mirrorInlineEndPadding, mirrorRow, mirrorTextAlign } from '../_core/direction';
import { CONTACT_FONT_SIZE, styles } from './styles';

/**
 * Gap between the decorator rail and the entry text, in points.
 *
 * Applied here rather than in `styles.ts` because it is an inline-START padding:
 * core's `mirrorInlineEndPadding` moves a `paddingRight` across for a right-to-left
 * CV, which is the opposite case. `styles.indentSpacer` includes this width — keep
 * the two in step.
 */
const DETAILS_GAP = 9;

/**
 * Timeline template — a date column, a decorator rail with a dot per entry, and a
 * shaded sidebar.
 *
 * Adapted from mnjul/html-resume (Apache-2.0), which typesets a résumé entirely in
 * HTML and CSS for printing. What carried over is the ARRANGEMENT: dates hanging
 * left of a continuous vertical rule, section headings indented to the same line
 * as the entry titles, and a light grey sidebar for the things that are not a
 * chronology. What could not carry over is how it draws any of that — the original
 * relies on `float`, `position: absolute` pseudo-elements and CSS `columns`, none
 * of which exist in the `react-pdf-html` subset — so every piece is rebuilt out of
 * flex boxes here and in `styles.ts`.
 */

/** Heading + first block never split across pages — see the classic template. */
function Section({
  title,
  locale,
  children,
}: {
  title: string;
  locale: Locale;
  children: ReactNode;
}): JSX.Element | null {
  if (!children) return null;
  const [first, ...rest] = Children.toArray(children);
  return (
    <div style={styles.section}>
      <div style={styles.keepTogether} {...KEEP_TOGETHER}>
        <Indented locale={locale}>
          <div style={styles.sectionTitle}>{title}</div>
        </Indented>
        {first}
      </div>
      {rest}
    </div>
  );
}

/**
 * Content pushed right by exactly the width of the date column + the rail, so a
 * section heading lines up with the entry titles below it and the dates hang out
 * to its left — the source design's `left: date-block-width + margin` offset.
 *
 * A spacer BOX rather than a `paddingLeft`, because the whole row then mirrors for
 * a right-to-left CV through `mirrorRow` alone. A padding would need its own side
 * flipped, which is the bug `mirrorInlineEndPadding` exists to fix elsewhere.
 */
function Indented({ locale, children }: { locale: Locale; children: ReactNode }): JSX.Element {
  return (
    <div style={mirrorRow(styles.indentRow, locale)}>
      <div style={styles.indentSpacer} />
      <div style={styles.indentBody}>{children}</div>
    </div>
  );
}

/**
 * Start and end as two SEPARATE lines, which is what the narrow date column wants
 * — `2015` over `present`, not `2015 — present` wrapped mid-dash.
 *
 * Deliberately not `dateRange` from core: that helper joins the two into one
 * string for the templates that print a date inline, and this template is the one
 * that does not. Both read the same fields and both honour BR-6 ("Present").
 */
function datePair(
  item: Pick<ExperienceItem | EducationItem, 'startDate' | 'endDate' | 'current'>,
  formatDate: (iso: string, fmt?: string) => string,
  fmt: string,
  presentLabel: string,
): [string, string] {
  const start = item.startDate ? formatDate(item.startDate, fmt) : '';
  const end = item.current ? presentLabel : item.endDate ? formatDate(item.endDate, fmt) : '';
  return [start, end];
}

function SideSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): JSX.Element | null {
  if (!children) return null;
  const [first, ...rest] = Children.toArray(children);
  return (
    <div style={styles.sideSection}>
      <div style={styles.keepTogether} {...KEEP_TOGETHER}>
        <div style={styles.sideTitle}>{title}</div>
        {first}
      </div>
      {rest}
    </div>
  );
}

/**
 * One row of the chronology: the two date lines, the rail with its dot, then the
 * details.
 *
 * Takes its already-mirrored styles as props rather than deriving them, so it can
 * live at module scope — a component redefined inside the render function is a new
 * type on every render, which remounts the whole subtree in the live preview.
 */
function Entry({
  dates,
  rowStyle,
  dateStyle,
  detailsStyle,
  children,
}: {
  dates: [string, string];
  rowStyle: CSSProperties;
  dateStyle: CSSProperties;
  detailsStyle: CSSProperties;
  children: ReactNode;
}): JSX.Element {
  const [start, end] = dates;
  return (
    <div style={rowStyle}>
      <div style={dateStyle}>
        <div>{start}</div>
        <div>{end}</div>
      </div>
      <div style={styles.rail}>
        <div style={styles.railStub} />
        <div style={styles.dot} />
        <div style={styles.railLine} />
      </div>
      <div style={detailsStyle}>{children}</div>
    </div>
  );
}

export default function Timeline({ resume, t, formatDate }: TemplateProps): JSX.Element {
  const levelLabel = (level: LanguageLevel): string =>
    level === 'native' ? t('dictionary.native') : level;

  const locale = resume.locale;
  const infoPairs = generalInfoPairs(resume, t, formatDate, FULL);
  const contacts = contactChannels(resume);
  const present = t('common.present');

  // The root IS the two-column row, so mirroring it moves the sidebar to the left
  // for a right-to-left CV. Core mirrors `manifest.pageBleed` to match — see
  // `bleedSide` — so the grey column follows it.
  const page = mirrorRow(styles.page, locale);
  const entryRow = mirrorRow(styles.entryRow, locale);
  // The date column is right-aligned so it hugs the rail; once the row flips, the
  // alignment and the gap have to cross with it or the dates drift to the paper
  // edge and leave the rail bare.
  const dateCol = mirrorTextAlign(mirrorInlineEndPadding(styles.dateCol, locale), locale);
  const placeRow = mirrorRow(styles.placeRow, locale);
  const place = mirrorInlineEndPadding(styles.place, locale);
  const details: CSSProperties = {
    ...styles.details,
    [isRtl(locale) ? 'paddingRight' : 'paddingLeft']: DETAILS_GAP,
  };
  const entryStyles = { rowStyle: entryRow, dateStyle: dateCol, detailsStyle: details };

  return (
    <div style={page}>
      <div style={styles.main}>
        <div style={styles.header}>
          <div style={styles.name}>{fullName(resume)}</div>
          {resume.basics.headline ? (
            <div style={styles.headline}>{resume.basics.headline}</div>
          ) : null}
        </div>

        <Section title={t('sections.summary')} locale={locale}>
          {resume.summary ? (
            <Indented locale={locale}>
              <p style={styles.paragraph}>{resume.summary}</p>
            </Indented>
          ) : null}
        </Section>

        <Section title={t('sections.experience')} locale={locale}>
          {hasItems(resume.experience)
            ? resume.experience.map((x) => (
                <Entry key={x.id} {...entryStyles} dates={datePair(x, formatDate, FULL, present)}>
                  <div style={styles.entryTitle}>{x.position}</div>
                  <div style={placeRow}>
                    <div style={place}>{x.company}</div>
                    <div style={styles.location}>{x.location ?? ''}</div>
                  </div>
                  {x.employmentType ? (
                    <div style={styles.entrySub}>{t(`dictionary.${x.employmentType}`)}</div>
                  ) : null}
                  {x.description ? <div style={styles.entryDesc}>{x.description}</div> : null}
                  <BulletList
                    items={highlights(x.highlights)}
                    listStyle={styles.bulletList}
                    itemStyle={styles.bulletItem}
                    locale={locale}
                  />
                </Entry>
              ))
            : null}
        </Section>

        <Section title={t('sections.projects')} locale={locale}>
          {hasItems(resume.projects)
            ? resume.projects.map((p) => (
                <Entry key={p.id} {...entryStyles} dates={['', '']}>
                  <div style={styles.entryTitle}>{p.name}</div>
                  {p.url ? (
                    <a style={styles.mainLink} href={p.url}>
                      {p.url}
                    </a>
                  ) : null}
                  {p.description ? <div style={styles.entryDesc}>{p.description}</div> : null}
                  <BulletList
                    items={highlights(p.highlights)}
                    listStyle={styles.bulletList}
                    itemStyle={styles.bulletItem}
                    locale={locale}
                  />
                </Entry>
              ))
            : null}
        </Section>

        <Section title={t('sections.education')} locale={locale}>
          {hasItems(resume.education)
            ? resume.education.map((e) => (
                <Entry key={e.id} {...entryStyles} dates={datePair(e, formatDate, MONTH, present)}>
                  <div style={styles.entryTitle}>{e.institution}</div>
                  <div style={styles.entrySub}>
                    {[e.degree ? t(`dictionary.${e.degree}`) : '', e.faculty, e.specialization]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                  {e.comment ? <div style={styles.entryDesc}>{e.comment}</div> : null}
                </Entry>
              ))
            : null}
        </Section>

        <Section title={t('sections.certifications')} locale={locale}>
          {hasItems(resume.certifications)
            ? resume.certifications.map((cert) => (
                <Entry
                  key={cert.id}
                  {...entryStyles}
                  dates={[cert.issueDate ? formatDate(cert.issueDate, MONTH) : '', '']}
                >
                  <div style={styles.entryTitle}>{cert.name}</div>
                  <div style={styles.entrySub}>{cert.organization}</div>
                  {cert.credentialUrl ? (
                    <a style={styles.mainLink} href={cert.credentialUrl}>
                      {t('common.seeCredential')}
                    </a>
                  ) : null}
                </Entry>
              ))
            : null}
        </Section>
      </div>

      <div style={styles.sidebar}>
        <SideSection title={t('sections.contact')}>
          {contacts.length > 0
            ? contacts.map((ch) => (
                <div key={ch.id} style={styles.sideItem}>
                  <ContactValue item={ch} style={styles.contactLink} textSize={CONTACT_FONT_SIZE} />
                </div>
              ))
            : null}
        </SideSection>

        <SideSection title={t('sections.generalInfo')}>
          {infoPairs.length > 0
            ? infoPairs.map(([label, value]) => (
                <div key={label} style={styles.sideItem}>
                  <div style={styles.sideLabel}>{label}</div>
                  {value}
                </div>
              ))
            : null}
        </SideSection>

        <SideSection title={t('sections.skills')}>
          {hasItems(resume.skills)
            ? resume.skills.map((s) => (
                <div key={s.id} style={styles.sideItem}>
                  {s.name}
                </div>
              ))
            : null}
        </SideSection>

        <SideSection title={t('sections.languages')}>
          {hasItems(resume.languages)
            ? resume.languages.map((l) => (
                <div key={l.id} style={styles.sideItem}>
                  {l.name} — {levelLabel(l.level)}
                </div>
              ))
            : null}
        </SideSection>

        <SideSection title={t('sections.interests')}>
          {hasItems(resume.interests) ? (
            <div style={styles.sideItem}>{resume.interests.map((i) => i.name).join(', ')}</div>
          ) : null}
        </SideSection>
      </div>
    </div>
  );
}
