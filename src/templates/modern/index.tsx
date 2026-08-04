import { Children, type JSX, type ReactNode } from 'react';
import type { TemplateProps } from '../_core/contract';
import type { LanguageLevel, Locale } from '../../types/resume';
import { BulletList } from '../_core/bullets';
import {
  contactChannels,
  contactDisplay,
  dateRange,
  fullName,
  generalInfoPairs,
  hasItems,
  highlights,
  KEEP_TOGETHER,
} from '../_core/render-helpers';
import { mirrorRow } from '../_core/direction';
import { styles } from './styles';

const FULL = 'DD.MM.YYYY';
const MONTH = 'MMM YYYY';

/** Heading + first block never split across pages — see the classic template. */
function MainSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): JSX.Element | null {
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

function Bullets({ items, locale }: { items: string[]; locale: Locale }): JSX.Element | null {
  return (
    <BulletList
      items={items}
      listStyle={styles.bulletList}
      locale={locale}
      itemStyle={styles.bulletItem}
    />
  );
}

/**
 * Modern template — accent sidebar (avatar, contacts, general info, skill bars,
 * languages) + main column. Visual, NOT ATS-safe (uses image + bars).
 */
export default function Modern({ resume, t, formatDate }: TemplateProps): JSX.Element {
  const levelLabel = (level: LanguageLevel): string =>
    level === 'native' ? t('dictionary.native') : level;

  const initials =
    `${resume.basics.firstName[0] ?? ''}${resume.basics.lastName[0] ?? ''}`.toUpperCase();
  const contacts = contactChannels(resume);
  const infoPairs = generalInfoPairs(resume, t, formatDate, FULL);
  // The root IS the two-column row, so mirroring it moves the sidebar to the
  // right for a right-to-left CV. Core mirrors `manifest.pageBleed` to match
  // (see `bleedSide`), so the accent column follows it.
  const page = mirrorRow(styles.page, resume.locale);
  /**
   * The skill bar fills from the READING edge. `barTrack` is an explicit
   * mirrored flex row rather than a block with a percentage-width child,
   * because a block child starts at the inline-start edge — which CSS resolves
   * against the inherited `direction` (so the preview filled from the right in
   * Arabic) while react-pdf has no direction at all and always filled from the
   * left. Same declaration, two different pictures; a mirrored row is the same
   * picture in both.
   */
  const barTrack = mirrorRow(styles.barTrack, resume.locale);

  return (
    <div style={page}>
      {/*
        The accent column is NOT drawn here. It is declared as
        `manifest.pageBleed` and painted by core at page level in both targets,
        because it has to reach the paper edges and repeat on every page —
        neither of which an element inside this markup can do. See `PageBleed`.
      */}
      <div style={styles.sidebar}>
        <div style={styles.avatarWrap}>
          {resume.media.avatar ? (
            <img style={styles.avatar} src={resume.media.avatar} alt="" />
          ) : (
            <div style={styles.avatarFallback}>{initials}</div>
          )}
        </div>
        <div style={styles.sideName}>{fullName(resume)}</div>
        {resume.basics.headline ? (
          <div style={styles.sideHeadline}>{resume.basics.headline}</div>
        ) : null}

        <SideSection title={t('sections.contact')}>
          {contacts.length > 0
            ? contacts.map((c) => (
                <div key={c.id} style={styles.sideItem}>
                  {contactDisplay(c)}
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
                  <div style={barTrack}>
                    <div
                      style={{
                        ...styles.barFill,
                        width: `${Math.max(0, Math.min(100, s.level))}%`,
                      }}
                    />
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
                  <Bullets items={highlights(x.highlights)} locale={resume.locale} />
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
                  <Bullets items={highlights(p.highlights)} locale={resume.locale} />
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
