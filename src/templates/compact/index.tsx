import { Children, type JSX, type ReactNode } from 'react';
import type { TemplateProps } from '../_core/contract';
import type { LanguageLevel, Locale } from '../../types/resume';
import { BulletList } from '../_core/bullets';
import {
  contactChannels,
  contactDisplay,
  DATE_FULL as FULL,
  DATE_MONTH_YEAR as MONTH,
  dateRange,
  fullName,
  generalInfoPairs,
  hasItems,
  highlights,
  KEEP_TOGETHER,
} from '../_core/render-helpers';
import { mirrorInlineEndPadding, mirrorRow } from '../_core/direction';
import { styles } from './styles';

/** Heading + first block never split across pages — see the classic template. */
function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element | null {
  if (!children) return null;
  const [first, ...rest] = Children.toArray(children);
  return (
    <div style={styles.section}>
      <div style={styles.keepTogether} {...KEEP_TOGETHER}>
        <div style={styles.sectionTitle}>{title}</div>
        {first}
      </div>
      {rest}
    </div>
  );
}

function Bullets({ items, locale }: { items: string[]; locale: Locale }): JSX.Element | null {
  return (
    <BulletList
      items={items}
      listStyle={styles.bulletList}
      locale={locale}
      itemStyle={styles.bulletItem}
      markWidth={8}
    />
  );
}

/**
 * Compact template — condensed single-column, ATS-safe. Smaller base size,
 * tighter margins, skills/interests as comma runs (spec v0.0.1 build plan).
 */
export default function Compact({ resume, t, formatDate }: TemplateProps): JSX.Element {
  const levelLabel = (level: LanguageLevel): string =>
    level === 'native' ? t('dictionary.native') : level;

  const contacts = contactChannels(resume).map(contactDisplay);
  const skillNames = resume.skills.map((s) => s.name).filter(Boolean);
  const languageText = resume.languages.map((l) => `${l.name} (${levelLabel(l.level)})`).join(', ');
  const interestText = (resume.interests ?? [])
    .map((i) => i.name)
    .filter(Boolean)
    .join(', ');

  // Same rows as every other template (`generalInfoPairs`), run together on one
  // line — condensed is this template's job, dropping the user's data is not.
  const infoParts = generalInfoPairs(resume, t, formatDate, FULL).map(
    ([label, value]) => `${label}: ${value}`,
  );

  // Rows read from the other end in a right-to-left CV: the entry title
  // belongs at the start of the line and its date at the far end.
  const headRow = mirrorRow(styles.entryHeadRow, resume.locale);
  // The gap between title and date follows them across (see the helper).
  const entryTitle = mirrorInlineEndPadding(styles.entryTitle, resume.locale);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.name}>{fullName(resume)}</div>
        {resume.basics.headline ? (
          <div style={styles.headline}>
            {resume.basics.headline}
            {resume.basics.location ? ` · ${resume.basics.location}` : ''}
          </div>
        ) : null}
        {contacts.length > 0 ? (
          <div style={styles.contactLine}>{contacts.join('  •  ')}</div>
        ) : null}
      </div>

      <Section title={t('sections.summary')}>
        {resume.summary ? <p style={styles.paragraph}>{resume.summary}</p> : null}
      </Section>

      <Section title={t('sections.generalInfo')}>
        {infoParts.length > 0 ? <div style={styles.infoLine}>{infoParts.join('  ·  ')}</div> : null}
      </Section>

      <Section title={t('sections.experience')}>
        {hasItems(resume.experience)
          ? resume.experience.map((x) => (
              <div key={x.id} style={styles.entry}>
                <div style={headRow}>
                  <div style={entryTitle}>
                    {[x.position, x.company].filter(Boolean).join(' — ')}
                    {x.location ? `, ${x.location}` : ''}
                  </div>
                  <div style={styles.entryDate}>
                    {dateRange(x, formatDate, FULL, t('common.present'))}
                  </div>
                </div>
                {x.description ? <div style={styles.entryDesc}>{x.description}</div> : null}
                <Bullets items={highlights(x.highlights)} locale={resume.locale} />
              </div>
            ))
          : null}
      </Section>

      <Section title={t('sections.projects')}>
        {hasItems(resume.projects)
          ? resume.projects.map((p) => (
              <div key={p.id} style={styles.entry}>
                <div style={headRow}>
                  <div style={entryTitle}>{p.name}</div>
                  {p.url ? (
                    <a style={styles.link} href={p.url}>
                      {p.url}
                    </a>
                  ) : null}
                </div>
                {p.description ? <div style={styles.entryDesc}>{p.description}</div> : null}
                <Bullets items={highlights(p.highlights)} locale={resume.locale} />
              </div>
            ))
          : null}
      </Section>

      <Section title={t('sections.education')}>
        {hasItems(resume.education)
          ? resume.education.map((e) => (
              <div key={e.id} style={styles.entry}>
                <div style={headRow}>
                  <div style={entryTitle}>{e.institution}</div>
                  <div style={styles.entryDate}>
                    {dateRange(e, formatDate, MONTH, t('common.present'))}
                  </div>
                </div>
                <div style={styles.entrySub}>
                  {[e.degree ? t(`dictionary.${e.degree}`) : '', e.faculty, e.specialization]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              </div>
            ))
          : null}
      </Section>

      <Section title={t('sections.skills')}>
        {skillNames.length > 0 ? (
          <div style={styles.inlineList}>{skillNames.join(', ')}</div>
        ) : null}
      </Section>

      <Section title={t('sections.languages')}>
        {languageText ? <div style={styles.inlineList}>{languageText}</div> : null}
      </Section>

      <Section title={t('sections.certifications')}>
        {hasItems(resume.certifications)
          ? resume.certifications.map((cert) => (
              <div key={cert.id} style={styles.entry}>
                <div style={headRow}>
                  <div style={entryTitle}>{cert.name}</div>
                  <div style={styles.entryDate}>
                    {cert.issueDate ? formatDate(cert.issueDate, MONTH) : ''}
                  </div>
                </div>
                <div style={styles.entrySub}>
                  {cert.organization}
                  {cert.credentialUrl ? (
                    <>
                      {' · '}
                      <a style={styles.link} href={cert.credentialUrl}>
                        {t('common.seeCredential')}
                      </a>
                    </>
                  ) : null}
                </div>
              </div>
            ))
          : null}
      </Section>

      <Section title={t('sections.interests')}>
        {interestText ? <div style={styles.inlineList}>{interestText}</div> : null}
      </Section>
    </div>
  );
}
