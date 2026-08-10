import { Children, type CSSProperties, type JSX, type ReactNode } from 'react';
import type { TemplateProps } from '../_core/contract';
import type { LanguageLevel, Locale } from '../../types/resume';
import { BulletList } from '../_core/bullets';
import { ContactList } from '../_core/contacts';
import {
  contactChannels,
  DATE_FULL as FULL,
  DATE_MONTH_YEAR as MONTH,
  dateRange,
  fullName,
  generalInfoPairs,
  hasItems,
  highlights,
  KEEP_TOGETHER,
  nameInitials,
} from '../_core/render-helpers';
import { isRtl, mirrorInlineEndPadding, mirrorRow } from '../_core/direction';
import { CONTACT_FONT_SIZE, styles } from './styles';

/**
 * Banner template — a full-width accent header carrying the photo and the contact
 * details, over a single column of chips and rule-marked entries.
 *
 * An ORIGINAL design. It takes only the arrangement idea from lduo/resume — lead
 * with a photo-and-identity band, then let the content run beneath it in blocks —
 * because that repository ships no licence at all, and an unlicensed work grants no
 * right to copy or adapt it. Nothing here is derived from its markup or its
 * stylesheet (both of which are a web page's: a reset, carousels, an audio control,
 * and none of it inside the `react-pdf-html` subset anyway). The green is a nod to
 * it, darkened until white text on the band is actually readable — see `theme.ts`.
 *
 * The one deliberate difference from the other two-column templates: there is no
 * sidebar, so a long CV keeps its full measure on every page instead of paginating
 * one narrow column against an empty one.
 */

/**
 * Skills, languages and interests all read as the same kind of chip.
 *
 * Takes its already-mirrored styles as props so it can live at module scope: a
 * component redefined inside the render function is a new type on every render,
 * which remounts the subtree in the live preview.
 */
function Pills({
  items,
  rowStyle,
  pillStyle,
}: {
  items: string[];
  rowStyle: CSSProperties;
  pillStyle: CSSProperties;
}): JSX.Element {
  return (
    <div style={rowStyle}>
      {items.map((label, i) => (
        <div key={`${label}-${i}`} style={pillStyle}>
          {label}
        </div>
      ))}
    </div>
  );
}

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

export default function Banner({ resume, t, formatDate }: TemplateProps): JSX.Element {
  const levelLabel = (level: LanguageLevel): string =>
    level === 'native' ? t('dictionary.native') : level;

  const locale: Locale = resume.locale;
  const rtl = isRtl(locale);
  const present = t('common.present');
  const infoPairs = generalInfoPairs(resume, t, formatDate, FULL);
  const contacts = contactChannels(resume);

  const band = mirrorRow(styles.band, locale);
  const headRow = mirrorRow(styles.headRow, locale);
  const wrapRow = mirrorRow(styles.wrapRow, locale);
  const entryTitle = mirrorInlineEndPadding(styles.entryTitle, locale);
  const half = mirrorInlineEndPadding(styles.half, locale);
  /**
   * The avatar's gap and the entry rule are both inline-START properties, and
   * react-pdf has no logical form of either — so the side is picked here rather
   * than declared in `styles.ts`, once, for the whole template.
   */
  const avatarGap: CSSProperties = { [rtl ? 'marginLeft' : 'marginRight']: 14 };
  const entry: CSSProperties = rtl
    ? {
        ...styles.entry,
        borderLeftWidth: 0,
        paddingLeft: 0,
        borderRightWidth: 2,
        borderRightStyle: 'solid',
        borderRightColor: styles.entry.borderLeftColor,
        paddingRight: styles.entry.paddingLeft,
      }
    : styles.entry;
  const pill: CSSProperties = { ...styles.pill, [rtl ? 'marginLeft' : 'marginRight']: 5 };

  /**
   * Resolved BEFORE the JSX, because `Section` decides whether to render at all
   * from whether it was handed children (BR-5). A `<Pills>` element that renders
   * nothing is still a truthy child, which would leave a heading standing over an
   * empty section — and a `KEEP_TOGETHER` box holding only its own heading.
   */
  const skillNames = resume.skills.map((s) => s.name).filter(Boolean);
  const languageLabels = resume.languages.map((l) => `${l.name} · ${levelLabel(l.level)}`);
  const interestNames = (resume.interests ?? []).map((i) => i.name).filter(Boolean);

  return (
    <div style={styles.page}>
      <div style={band}>
        <div style={avatarGap}>
          {resume.media.avatar ? (
            <img style={styles.avatar} src={resume.media.avatar} alt="" />
          ) : (
            <div style={styles.avatarFallback}>
              {nameInitials(resume.basics.firstName, resume.basics.lastName)}
            </div>
          )}
        </div>
        <div style={styles.bandText}>
          <div style={styles.name}>{fullName(resume)}</div>
          {resume.basics.headline ? (
            <div style={styles.headline}>
              {resume.basics.headline}
              {resume.basics.location ? ` · ${resume.basics.location}` : ''}
            </div>
          ) : null}
          {contacts.length > 0 ? (
            <div style={styles.bandContacts}>
              <ContactList
                items={contacts}
                separator="  ·  "
                style={styles.bandContactLink}
                textSize={CONTACT_FONT_SIZE}
                iconTone="light"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div style={styles.body}>
        <Section title={t('sections.summary')}>
          {resume.summary ? <p style={styles.paragraph}>{resume.summary}</p> : null}
        </Section>

        <Section title={t('sections.experience')}>
          {hasItems(resume.experience)
            ? resume.experience.map((x) => (
                <div key={x.id} style={entry}>
                  <div style={headRow}>
                    <div style={entryTitle}>{x.position}</div>
                    <div style={styles.entryDate}>{dateRange(x, formatDate, FULL, present)}</div>
                  </div>
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
              ))
            : null}
        </Section>

        <Section title={t('sections.projects')}>
          {hasItems(resume.projects)
            ? resume.projects.map((p) => (
                <div key={p.id} style={entry}>
                  <div style={headRow}>
                    <div style={entryTitle}>{p.name}</div>
                    <div style={styles.entryDate}>{''}</div>
                  </div>
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
              ))
            : null}
        </Section>

        <Section title={t('sections.education')}>
          {hasItems(resume.education)
            ? resume.education.map((e) => (
                <div key={e.id} style={entry}>
                  <div style={headRow}>
                    <div style={entryTitle}>{e.institution}</div>
                    <div style={styles.entryDate}>{dateRange(e, formatDate, MONTH, present)}</div>
                  </div>
                  <div style={styles.entrySub}>
                    {[e.degree ? t(`dictionary.${e.degree}`) : '', e.faculty, e.specialization]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                  {e.comment ? <div style={styles.entryDesc}>{e.comment}</div> : null}
                </div>
              ))
            : null}
        </Section>

        <Section title={t('sections.certifications')}>
          {hasItems(resume.certifications)
            ? resume.certifications.map((cert) => (
                <div key={cert.id} style={entry}>
                  <div style={headRow}>
                    <div style={entryTitle}>{cert.name}</div>
                    <div style={styles.entryDate}>
                      {cert.issueDate ? formatDate(cert.issueDate, MONTH) : ''}
                    </div>
                  </div>
                  <div style={styles.entrySub}>{cert.organization}</div>
                  {cert.credentialUrl ? (
                    <a style={styles.link} href={cert.credentialUrl}>
                      {t('common.seeCredential')}
                    </a>
                  ) : null}
                </div>
              ))
            : null}
        </Section>

        <Section title={t('sections.generalInfo')}>
          {infoPairs.length > 0 ? (
            <div style={wrapRow}>
              {infoPairs.map(([label, value]) => (
                <div key={label} style={half}>
                  <div style={styles.infoLabel}>{label}</div>
                  <div style={styles.infoValue}>{value}</div>
                </div>
              ))}
            </div>
          ) : null}
        </Section>

        <Section title={t('sections.skills')}>
          {skillNames.length > 0 ? (
            <Pills items={skillNames} rowStyle={wrapRow} pillStyle={pill} />
          ) : null}
        </Section>

        <Section title={t('sections.languages')}>
          {languageLabels.length > 0 ? (
            <Pills items={languageLabels} rowStyle={wrapRow} pillStyle={pill} />
          ) : null}
        </Section>

        <Section title={t('sections.interests')}>
          {interestNames.length > 0 ? (
            <Pills items={interestNames} rowStyle={wrapRow} pillStyle={pill} />
          ) : null}
        </Section>
      </div>
    </div>
  );
}
