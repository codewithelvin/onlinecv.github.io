import { Children, type JSX, type ReactNode } from 'react';
import type { TemplateProps } from '../_core/contract';
import type { EducationItem, ExperienceItem, LanguageLevel, Locale } from '../../types/resume';
import { BulletList } from '../_core/bullets';
import { ContactList } from '../_core/contacts';
import {
  contactChannels,
  DATE_FULL as FULL,
  DATE_MONTH_YEAR as MONTH,
  fullName,
  generalInfoPairs,
  hasItems,
  highlights,
  KEEP_TOGETHER,
  nameInitials,
} from '../_core/render-helpers';
import { mirrorInlineEndPadding, mirrorRow, mirrorTextAlign } from '../_core/direction';
import { CONTACT_FONT_SIZE, styles } from './styles';

/**
 * Gutter template — a right-aligned margin column carrying the photo and every
 * date, against a typographic main column.
 *
 * Adapted from maitrenem/free-resume-theme (MIT). Its one strong idea is that the
 * DATES do not belong beside the job title: they are pulled out into the margin, so
 * the main column reads as prose and the chronology can be scanned down the edge in
 * one pass. Everything else follows from that — a very large name, section headings
 * set light, wide-tracked and muted, and the accent spent only on the date
 * separator, the links and the skill bars.
 *
 * The original does the pull with `float` and a negative margin, which the
 * `react-pdf-html` subset has neither of (and which would not survive a page
 * break). Here every block is a two-cell flex `Row` sharing one gutter width, which
 * gives the same picture and paginates.
 */

/** Photo, dates, or nothing — whatever this block hangs in the margin. */
function Row({
  locale,
  aside,
  children,
}: {
  locale: Locale;
  aside?: ReactNode;
  children: ReactNode;
}): JSX.Element {
  // The gutter is right-aligned against the content, so for a right-to-left CV
  // both the alignment and the gap have to cross with the row.
  const asideStyle = mirrorTextAlign(mirrorInlineEndPadding(styles.aside, locale), locale);
  return (
    <div style={mirrorRow(styles.row, locale)}>
      <div style={asideStyle}>{aside ?? ''}</div>
      <div style={styles.body}>{children}</div>
    </div>
  );
}

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
        <Row locale={locale}>
          <div style={styles.sectionTitle}>{title}</div>
        </Row>
        {first}
      </div>
      {rest}
    </div>
  );
}

/**
 * `2015 / present` — the source's `.cv-time-period`, whose slash is the one place
 * the accent colour appears in running text.
 *
 * Inline `<span>`s are correct here and only here: `react-pdf-html` buckets
 * consecutive inline elements into a single `Text`, which is exactly what a phrase
 * wants. (The rule they would break is about flex ROWS, where bucketing collapses
 * the children a `space-between` needs to push apart.)
 */
function Period({
  item,
  formatDate,
  fmt,
  presentLabel,
}: {
  item: Pick<ExperienceItem | EducationItem, 'startDate' | 'endDate' | 'current'>;
  formatDate: (iso: string, fmt?: string) => string;
  fmt: string;
  presentLabel: string;
}): JSX.Element | null {
  const start = item.startDate ? formatDate(item.startDate, fmt) : '';
  const end = item.current ? presentLabel : item.endDate ? formatDate(item.endDate, fmt) : '';
  if (!start && !end) return null;
  return (
    <div style={styles.period}>
      {start}
      {start && end ? <span style={styles.slash}> / </span> : null}
      {end}
    </div>
  );
}

export default function Minimal({ resume, t, formatDate }: TemplateProps): JSX.Element {
  const levelLabel = (level: LanguageLevel): string =>
    level === 'native' ? t('dictionary.native') : level;

  const locale = resume.locale;
  const present = t('common.present');
  const infoPairs = generalInfoPairs(resume, t, formatDate, FULL);
  const contacts = contactChannels(resume);
  const interestText = (resume.interests ?? [])
    .map((i) => i.name)
    .filter(Boolean)
    .join(', ');
  // The bar fills from the reading edge — see the modern template for why this is
  // an explicit mirrored row and not a block with a percentage-width child.
  const barTrack = mirrorRow(styles.barTrack, locale);
  const half = mirrorInlineEndPadding(styles.half, locale);
  const wrapRow = mirrorRow(styles.wrapRow, locale);

  return (
    <div style={styles.page}>
      <Row
        locale={locale}
        aside={
          <div style={styles.photoBox}>
            {resume.media.avatar ? (
              <img style={styles.photo} src={resume.media.avatar} alt="" />
            ) : (
              <div style={styles.photoFallback}>
                {nameInitials(resume.basics.firstName, resume.basics.lastName)}
              </div>
            )}
          </div>
        }
      >
        <div style={styles.author}>
          <div style={styles.name}>{fullName(resume)}</div>
          {resume.basics.headline ? (
            <div style={styles.headline}>
              {resume.basics.headline}
              {resume.basics.location ? ` · ${resume.basics.location}` : ''}
            </div>
          ) : null}
          {contacts.length > 0 ? (
            <div style={styles.contactLine}>
              <ContactList
                items={contacts}
                separator="  ·  "
                style={styles.contactLink}
                textSize={CONTACT_FONT_SIZE}
              />
            </div>
          ) : null}
        </div>
      </Row>

      <Section title={t('sections.summary')} locale={locale}>
        {resume.summary ? (
          <Row locale={locale}>
            <p style={styles.paragraph}>{resume.summary}</p>
          </Row>
        ) : null}
      </Section>

      <Section title={t('sections.experience')} locale={locale}>
        {hasItems(resume.experience)
          ? resume.experience.map((x) => (
              <Row
                key={x.id}
                locale={locale}
                aside={
                  <Period item={x} formatDate={formatDate} fmt={FULL} presentLabel={present} />
                }
              >
                <div style={styles.entry}>
                  <div style={styles.entryTitle}>{x.position}</div>
                  <div style={styles.entrySub}>
                    {[x.company, x.location].filter(Boolean).join(', ')}
                    {x.employmentType ? ` · ${t(`dictionary.${x.employmentType}`)}` : ''}
                  </div>
                  {x.description ? <div style={styles.entryDesc}>{x.description}</div> : null}
                  <BulletList
                    items={highlights(x.highlights)}
                    listStyle={styles.bulletList}
                    itemStyle={styles.bulletItem}
                    locale={locale}
                  />
                </div>
              </Row>
            ))
          : null}
      </Section>

      <Section title={t('sections.projects')} locale={locale}>
        {hasItems(resume.projects)
          ? resume.projects.map((p) => (
              <Row key={p.id} locale={locale}>
                <div style={styles.entry}>
                  <div style={styles.entryTitle}>{p.name}</div>
                  {p.url ? (
                    <a style={styles.link} href={p.url}>
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
                </div>
              </Row>
            ))
          : null}
      </Section>

      <Section title={t('sections.education')} locale={locale}>
        {hasItems(resume.education)
          ? resume.education.map((e) => (
              <Row
                key={e.id}
                locale={locale}
                aside={
                  <Period item={e} formatDate={formatDate} fmt={MONTH} presentLabel={present} />
                }
              >
                <div style={styles.entry}>
                  <div style={styles.entryTitle}>{e.institution}</div>
                  <div style={styles.entrySub}>
                    {[e.degree ? t(`dictionary.${e.degree}`) : '', e.faculty, e.specialization]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                  {e.comment ? <div style={styles.entryDesc}>{e.comment}</div> : null}
                </div>
              </Row>
            ))
          : null}
      </Section>

      <Section title={t('sections.certifications')} locale={locale}>
        {hasItems(resume.certifications)
          ? resume.certifications.map((cert) => (
              <Row
                key={cert.id}
                locale={locale}
                aside={
                  cert.issueDate ? (
                    <div style={styles.period}>{formatDate(cert.issueDate, MONTH)}</div>
                  ) : null
                }
              >
                <div style={styles.entry}>
                  <div style={styles.entryTitle}>{cert.name}</div>
                  <div style={styles.entrySub}>{cert.organization}</div>
                  {cert.credentialUrl ? (
                    <a style={styles.link} href={cert.credentialUrl}>
                      {t('common.seeCredential')}
                    </a>
                  ) : null}
                </div>
              </Row>
            ))
          : null}
      </Section>

      <Section title={t('sections.skills')} locale={locale}>
        {hasItems(resume.skills) ? (
          <Row locale={locale}>
            {resume.skills.map((s) => (
              <div key={s.id} style={styles.skill}>
                <div style={styles.skillName}>{s.name}</div>
                <div style={barTrack}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${Math.max(0, Math.min(100, s.level))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </Row>
        ) : null}
      </Section>

      <Section title={t('sections.languages')} locale={locale}>
        {hasItems(resume.languages) ? (
          <Row locale={locale}>
            <div style={wrapRow}>
              {resume.languages.map((l) => (
                <div key={l.id} style={half}>
                  <div style={styles.languageName}>{l.name}</div>
                  <div style={styles.languageLevel}>{levelLabel(l.level)}</div>
                </div>
              ))}
            </div>
          </Row>
        ) : null}
      </Section>

      <Section title={t('sections.generalInfo')} locale={locale}>
        {infoPairs.length > 0 ? (
          <Row locale={locale}>
            <div style={wrapRow}>
              {infoPairs.map(([label, value]) => (
                <div key={label} style={half}>
                  <div style={styles.infoLabel}>{label}</div>
                  <div style={styles.infoValue}>{value}</div>
                </div>
              ))}
            </div>
          </Row>
        ) : null}
      </Section>

      <Section title={t('sections.interests')} locale={locale}>
        {interestText ? (
          <Row locale={locale}>
            <div style={styles.inlineList}>{interestText}</div>
          </Row>
        ) : null}
      </Section>
    </div>
  );
}
