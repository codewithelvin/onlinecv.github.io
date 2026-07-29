import type { JSX, ReactNode } from 'react';
import type { TemplateProps } from '../_core/contract';
import type { LanguageLevel } from '../../types/resume';
import {
  contactChannels,
  dateRange,
  fullName,
  hasItems,
  highlights,
} from '../_core/render-helpers';
import { calcAge } from '../../utils/date';
import { styles } from './styles';

const FULL = 'DD.MM.YYYY';
const MONTH = 'MMM YYYY';

/** Section wrapper — renders nothing when the body is empty (BR-5). */
function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element | null {
  if (!children) return null;
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function Bullets({ items }: { items: string[] }): JSX.Element | null {
  if (items.length === 0) return null;
  return (
    <ul style={styles.bulletList}>
      {items.map((h, i) => (
        <li key={i} style={styles.bulletItem}>
          {h}
        </li>
      ))}
    </ul>
  );
}

/**
 * Classic template — single-column, image-free, real-text. The ATS-safe default
 * (spec §7.1). Skills and languages render as plain text.
 */
export default function Classic({ resume, t, formatDate }: TemplateProps): JSX.Element {
  const levelLabel = (level: LanguageLevel): string =>
    level === 'native' ? t('dictionary.native') : level;

  const gi = resume.generalInfo;
  const age = calcAge(gi.dateOfBirth);
  const infoPairs: Array<[string, string]> = [];
  if (gi.dateOfBirth) {
    infoPairs.push([
      t('cvLabels.dateOfBirth'),
      `${formatDate(gi.dateOfBirth, FULL)}${age !== null ? ` (${age} ${t('common.years')})` : ''}`,
    ]);
  }
  if (gi.gender) infoPairs.push([t('cvLabels.gender'), t(`dictionary.${gi.gender}`)]);
  if (gi.maritalStatus) infoPairs.push([t('cvLabels.maritalStatus'), t(`dictionary.${gi.maritalStatus}`)]);
  if (gi.nationality) infoPairs.push([t('cvLabels.nationality'), gi.nationality]);
  if (gi.militaryStatus) infoPairs.push([t('cvLabels.military'), t(`dictionary.${gi.militaryStatus}`)]);
  if (gi.driverLicense && gi.driverLicense.length > 0) {
    infoPairs.push([t('cvLabels.driverLicense'), gi.driverLicense.join(', ')]);
  }

  const contacts = contactChannels(resume).map((c) => c.value);
  const skillNames = resume.skills.map((s) => s.name).filter(Boolean);
  const languageText = resume.languages
    .map((l) => `${l.name} (${levelLabel(l.level)})`)
    .join('  •  ');
  const interestText = (resume.interests ?? []).map((i) => i.name).filter(Boolean).join(', ');

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
        {infoPairs.length > 0 ? (
          <div style={styles.infoRow}>
            {infoPairs.map(([label, value]) => (
              <div key={label} style={styles.infoPair}>
                <span style={styles.infoLabel}>{label}: </span>
                {value}
              </div>
            ))}
          </div>
        ) : null}
      </Section>

      <Section title={t('sections.experience')}>
        {hasItems(resume.experience)
          ? resume.experience.map((x) => (
              <div key={x.id} style={styles.entry}>
                <div style={styles.entryHeadRow}>
                  <span style={styles.entryTitle}>
                    {[x.position, x.company].filter(Boolean).join(' — ')}
                    {x.location ? `, ${x.location}` : ''}
                  </span>
                  <span style={styles.entryDate}>{dateRange(x, formatDate, FULL, t('common.present'))}</span>
                </div>
                {x.employmentType ? (
                  <div style={styles.entrySub}>{t(`dictionary.${x.employmentType}`)}</div>
                ) : null}
                {x.description ? <div style={styles.entryDesc}>{x.description}</div> : null}
                <Bullets items={highlights(x.highlights)} />
              </div>
            ))
          : null}
      </Section>

      <Section title={t('sections.projects')}>
        {hasItems(resume.projects)
          ? resume.projects.map((p) => (
              <div key={p.id} style={styles.entry}>
                <div style={styles.entryHeadRow}>
                  <span style={styles.entryTitle}>{p.name}</span>
                  {p.url ? (
                    <a style={styles.link} href={p.url}>
                      {p.url}
                    </a>
                  ) : null}
                </div>
                {p.description ? <div style={styles.entryDesc}>{p.description}</div> : null}
                <Bullets items={highlights(p.highlights)} />
              </div>
            ))
          : null}
      </Section>

      <Section title={t('sections.education')}>
        {hasItems(resume.education)
          ? resume.education.map((e) => (
              <div key={e.id} style={styles.entry}>
                <div style={styles.entryHeadRow}>
                  <span style={styles.entryTitle}>{e.institution}</span>
                  <span style={styles.entryDate}>{dateRange(e, formatDate, MONTH, t('common.present'))}</span>
                </div>
                <div style={styles.entrySub}>
                  {[
                    e.degree ? t(`dictionary.${e.degree}`) : '',
                    e.faculty,
                    e.specialization,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </div>
                {e.comment ? <div style={styles.entryDesc}>{e.comment}</div> : null}
              </div>
            ))
          : null}
      </Section>

      <Section title={t('sections.skills')}>
        {skillNames.length > 0 ? <div style={styles.inlineList}>{skillNames.join(', ')}</div> : null}
      </Section>

      <Section title={t('sections.languages')}>
        {languageText ? <div style={styles.inlineList}>{languageText}</div> : null}
      </Section>

      <Section title={t('sections.certifications')}>
        {hasItems(resume.certifications)
          ? resume.certifications.map((cert) => (
              <div key={cert.id} style={styles.entry}>
                <div style={styles.entryHeadRow}>
                  <span style={styles.entryTitle}>{cert.name}</span>
                  <span style={styles.entryDate}>
                    {cert.issueDate ? formatDate(cert.issueDate, MONTH) : ''}
                  </span>
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
