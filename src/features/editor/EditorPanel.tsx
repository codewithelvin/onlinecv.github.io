import type { JSX, ReactNode } from 'react';
import { Collapse, Tag, Typography } from 'antd';
import {
  FiAward,
  FiBookOpen,
  FiFolder,
  FiGlobe,
  FiHeart,
  FiPhone,
  FiStar,
  FiUser,
  FiBriefcase,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../../state/store';
import { FieldScope, VerticalFields } from '../../components/form/fields';
import { SectionHelpButton } from '../help/HelpButton';
import { tourSectionClass } from '../tour/steps';
import { BasicsSection } from './sections/BasicsSection';
import { GeneralInfoSection } from './sections/GeneralInfoSection';
import { ContactSection } from './sections/ContactSection';
import { ExperienceSection } from './sections/ExperienceSection';
import { ProjectsSection } from './sections/ProjectsSection';
import { EducationSection } from './sections/EducationSection';
import { SkillsSection } from './sections/SkillsSection';
import { LanguagesSection } from './sections/LanguagesSection';
import { CertificationsSection } from './sections/CertificationsSection';
import { InterestsSection } from './sections/InterestsSection';

/** Sections expanded on a first visit, before the user collapses anything. */
const DEFAULT_OPEN_SECTIONS = ['basics', 'contact', 'experience'];

/**
 * Accordion header: section icon, bold title, and — for sections that hold a
 * list — a counter of how many entries have been added. The expand chevron is
 * pinned to the right end by the `Collapse`'s `expandIconPosition`.
 */
function SectionHeader({
  icon,
  title,
  count,
  section,
}: {
  icon: ReactNode;
  title: string;
  count?: number;
  /** The section's key — what decides which guide article its `?` opens. */
  section: string;
}): JSX.Element {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ display: 'inline-flex', fontSize: 16, lineHeight: 1 }}>{icon}</span>
      <Typography.Text strong>{title}</Typography.Text>
      {count !== undefined ? (
        <Tag
          color={count > 0 ? 'blue' : 'default'}
          style={{ marginInlineEnd: 0, fontVariantNumeric: 'tabular-nums' }}
        >
          {count}
        </Tag>
      ) : null}
      {/* Next to the title rather than at the far end of the row: the question it
          answers is "what does THIS section want?", so it belongs to the name, not
          to the panel. It stops its own click reaching the accordion — see
          `SectionHelpButton`. */}
      <SectionHelpButton section={section} />
    </span>
  );
}

/** One accordion entry. `selfScoped` sections name their own controls — see below. */
interface SectionItem {
  key: string;
  label: JSX.Element;
  children: ReactNode;
  /** True when the section already wraps its own `FieldScope`(s). */
  selfScoped?: boolean;
}

/**
 * The editor: collapsible section cards (spec §10.2), in the order the CV is
 * filled in. `Özünüzü qısa təsvir edin` lives inside "Əsas məlumatlar".
 */
export function EditorPanel(): JSX.Element {
  const { t } = useTranslation();
  const resume = useResumeStore((s) => s.resume);
  // Which sections are open is persisted alongside the resume, so an accidental
  // refresh doesn't re-expand everything the user had collapsed.
  const openSections = useResumeStore((s) => s.openSections);
  const setOpenSections = useResumeStore((s) => s.setOpenSections);

  /**
   * Every section is mounted inside a `FieldScope` named after its key, which is
   * what gives its controls, item rows and buttons stable DOM ids
   * (`#basics-firstName`, `#experience-add`) for test automation. Doing it here
   * rather than in each section keeps the naming in one place — and a section's
   * item-editor modal inherits the scope through the portal, so its fields are
   * `#experience-position` and friends.
   */
  const items: SectionItem[] = [
    {
      /**
       * "Əsas məlumatlar" and "Ümumi məlumat" are ONE panel: both describe the
       * same person on the same screen, and splitting them only cost the user an
       * extra expand and a scroll past a header.
       *
       * The two halves keep separate `FieldScope`s so their controls keep the
       * ids they have always had (`#basics-firstName`, `#generalInfo-gender`) —
       * those are the app's contract with QA automation, and merging the panels
       * is a layout decision that must not rewrite them.
       */
      key: 'basics',
      label: (
        <SectionHeader
          icon={<FiUser aria-hidden />}
          title={t('sections.basics')}
          section="basics"
        />
      ),
      selfScoped: true,
      children: (
        <>
          <FieldScope name="basics">
            <BasicsSection />
          </FieldScope>
          <FieldScope name="generalInfo">
            <GeneralInfoSection />
          </FieldScope>
        </>
      ),
    },
    {
      key: 'contact',
      label: (
        <SectionHeader
          icon={<FiPhone aria-hidden />}
          title={t('sections.contact')}
          section="contact"
          count={resume.contact.items.length}
        />
      ),
      children: <ContactSection />,
    },
    {
      key: 'experience',
      label: (
        <SectionHeader
          icon={<FiBriefcase aria-hidden />}
          title={t('sections.experience')}
          section="experience"
          count={resume.experience.length}
        />
      ),
      children: <ExperienceSection />,
    },
    {
      key: 'education',
      label: (
        <SectionHeader
          icon={<FiBookOpen aria-hidden />}
          title={t('sections.education')}
          section="education"
          count={resume.education.length}
        />
      ),
      children: <EducationSection />,
    },
    {
      key: 'certifications',
      label: (
        <SectionHeader
          icon={<FiAward aria-hidden />}
          title={t('sections.certifications')}
          section="certifications"
          count={(resume.certifications ?? []).length}
        />
      ),
      children: <CertificationsSection />,
    },
    {
      key: 'skills',
      label: (
        <SectionHeader
          icon={<FiStar aria-hidden />}
          title={t('sections.skills')}
          section="skills"
          count={resume.skills.length}
        />
      ),
      children: <SkillsSection />,
    },
    {
      key: 'languages',
      label: (
        <SectionHeader
          icon={<FiGlobe aria-hidden />}
          title={t('sections.languages')}
          section="languages"
          count={resume.languages.length}
        />
      ),
      children: <LanguagesSection />,
    },
    {
      key: 'projects',
      label: (
        <SectionHeader
          icon={<FiFolder aria-hidden />}
          title={t('sections.projects')}
          section="projects"
          count={(resume.projects ?? []).length}
        />
      ),
      children: <ProjectsSection />,
    },
    {
      key: 'interests',
      label: (
        <SectionHeader
          icon={<FiHeart aria-hidden />}
          title={t('sections.interests')}
          section="interests"
          count={(resume.interests ?? []).length}
        />
      ),
      children: <InterestsSection />,
    },
  ];

  return (
    <VerticalFields>
      <Collapse
        items={items.map(({ selfScoped, ...item }) => ({
          ...item,
          /**
           * How the editor tour addresses a section. A CLASS because `Collapse`
           * forwards `className` to the panel wrapper and does not forward an id
           * — and built by `tourSectionClass` so the markup and the tour's
           * selector cannot drift apart. Not a style hook: nothing in `index.css`
           * matches it.
           */
          className: tourSectionClass(item.key),
          children: selfScoped ? (
            item.children
          ) : (
            <FieldScope name={item.key}>{item.children}</FieldScope>
          ),
        }))}
        activeKey={openSections ?? DEFAULT_OPEN_SECTIONS}
        onChange={(keys) => setOpenSections(Array.isArray(keys) ? keys : [keys])}
        expandIconPosition="end"
        style={{ background: 'transparent' }}
      />
    </VerticalFields>
  );
}
