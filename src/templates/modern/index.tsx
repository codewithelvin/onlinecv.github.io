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

function MainSection({ title, children }: { title: string; children: ReactNode }): JSX.Element | null {
  if (!children) return null;
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function SideSection({ title, children }: { title: string; children: ReactNode }): JSX.Element | null {
  if (!children) return null;
  return (
    <div style={styles.sideSection}>
      <div style={styles.sideTitle}>{title}</div>
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
 * Modern template — accent sidebar (avatar, contacts, general info, skill bars,
 * languages) + main column. Visual, NOT ATS-safe (uses image + bars).
 */
export default function Modern({ resume, t, formatDate }: TemplateProps): JSX.Element {
  const levelLabel = (level: LanguageLevel): string =>
    level === 'native' ? t('dictionary.native') : level;

  const initials = `${resume.basics.firstName[0] ?? ''}${resume.basics.lastName[0] ?? ''}`.toUpperCase();
  const contacts = contactChannels(resume);
  const gi = resume.generalInfo;
  const age = calcAge(gi.dateOfBirth);

  const infoPairs: Array<[string, string]> = [];
  if (gi.dateOfBirth) {
    infoPairs.push([
      t('cvLabels.dateOfBirth'),
      `${formatDate(gi.dateOfBirth, FULL)}${age !== null ? ` (${age})` : ''}`,
    ]);
  }
  if (gi.nationality) infoPairs.push([t('cvLabels.nationality'), gi.nationality]);
  if (gi.maritalStatus) infoPairs.push([t('cvLabels.maritalStatus'), t(`dictionary.${gi.maritalStatus}`)]);
  if (gi.militaryStatus) infoPairs.push([t('cvLabels.military'), t(`dictionary.${gi.militaryStatus}`)]);
  if (gi.driverLicense && gi.driverLicense.length > 0) {
    infoPairs.push([t('cvLabels.driverLicense'), gi.driverLicense.join(', ')]);
  }

  return (
    <div style={styles.page}>
      <div style={styles.sidebar}>
        <div style={styles.avatarWrap}>
          {resume.media.avatar ? (
            <img style={styles.avatar} src={resume.media.avatar} alt="" />
          ) : (
            <div style={styles.avatarFallback}>{initials}</div>
          )}
        </div>
        <div style={styles.sideName}>{fullName(resume)}</div>
        {resume.basics.headline ? <div style={styles.sideHeadline}>{resume.basics.headline}</div> : null}

        <SideSection title={t('sections.contact')}>
          {contacts.length > 0
            ? contacts.map((c) => (
                <div key={c.id} style={styles.sideItem}>
                  {c.value}
                </div>
              ))
            : null}
        </SideSection>

        <SideSection title={t('sections.generalInfo')}>
          {infoPairs.length > 0
            ? infoPairs.map(([label, value]) => (
                <div key={label} style={styles.sideItem}>
                  {label}: {value}
                </div>
              ))
            : null}
        </SideSection>

        <SideSection title={t('sections.skills')}>
          {hasItems(resume.skills)
            ? resume.skills.map((s) => (
                <div key={s.id}>
                  <div style={styles.barLabel}>{s.name}</div>
                  <div style={styles.barTrack}>
                    <div style={{ ...styles.barFill, width: `${Math.max(0, Math.min(100, s.level))}%` }} />
                  </div>
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
      </div>

      <div style={styles.main}>
        <MainSection title={t('sections.summary')}>
          {resume.summary ? <p style={styles.paragraph}>{resume.summary}</p> : null}
        </MainSection>

        <MainSection title={t('sections.experience')}>
          {hasItems(resume.experience)
            ? resume.experience.map((x) => (
                <div key={x.id} style={styles.entry}>
                  <div style={styles.entryTitle}>{x.position}</div>
                  <div style={styles.entryMeta}>
                    {[x.company, x.location].filter(Boolean).join(', ')}
                    {x.employmentType ? ` · ${t(`dictionary.${x.employmentType}`)}` : ''}
                    {' · '}
                    {dateRange(x, formatDate, FULL, t('common.present'))}
                  </div>
                  {x.description ? <div style={styles.entryDesc}>{x.description}</div> : null}
                  <Bullets items={highlights(x.highlights)} />
                </div>
              ))
            : null}
        </MainSection>

        <MainSection title={t('sections.projects')}>
          {hasItems(resume.projects)
            ? resume.projects.map((p) => (
                <div key={p.id} style={styles.entry}>
                  <div style={styles.entryTitle}>{p.name}</div>
                  {p.url ? (
                    <a style={styles.mainLink} href={p.url}>
                      {p.url}
                    </a>
                  ) : null}
                  {p.description ? <div style={styles.entryDesc}>{p.description}</div> : null}
                  <Bullets items={highlights(p.highlights)} />
                </div>
              ))
            : null}
        </MainSection>

        <MainSection title={t('sections.education')}>
          {hasItems(resume.education)
            ? resume.education.map((e) => (
                <div key={e.id} style={styles.entry}>
                  <div style={styles.entryTitle}>{e.institution}</div>
                  <div style={styles.entryMeta}>
                    {[e.degree ? t(`dictionary.${e.degree}`) : '', e.faculty, e.specialization]
                      .filter(Boolean)
                      .join(', ')}
                    {' · '}
                    {dateRange(e, formatDate, MONTH, t('common.present'))}
                  </div>
                </div>
              ))
            : null}
        </MainSection>

        <MainSection title={t('sections.certifications')}>
          {hasItems(resume.certifications)
            ? resume.certifications.map((cert) => (
                <div key={cert.id} style={styles.entry}>
                  <div style={styles.entryTitle}>{cert.name}</div>
                  <div style={styles.entryMeta}>
                    {[cert.organization, cert.issueDate ? formatDate(cert.issueDate, MONTH) : '']
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  {cert.credentialUrl ? (
                    <a style={styles.mainLink} href={cert.credentialUrl}>
                      {t('common.seeCredential')}
                    </a>
                  ) : null}
                </div>
              ))
            : null}
        </MainSection>

        <MainSection title={t('sections.interests')}>
          {hasItems(resume.interests) ? (
            <div style={styles.paragraph}>{resume.interests.map((i) => i.name).join(', ')}</div>
          ) : null}
        </MainSection>
      </div>
    </div>
  );
}
