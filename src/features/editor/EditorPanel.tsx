import type { JSX, ReactNode } from 'react';
import { Collapse, Tag, Typography } from 'antd';
import {
  FiAward,
  FiBookOpen,
  FiFolder,
  FiGlobe,
  FiHeart,
  FiInfo,
  FiPhone,
  FiStar,
  FiUser,
  FiBriefcase,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../../state/store';
import { VerticalFields } from '../../components/form/fields';
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
const DEFAULT_OPEN_SECTIONS = ['basics', 'generalInfo', 'contact', 'experience'];

/**
 * Accordion header: section icon, bold title, and — for sections that hold a
 * list — a counter of how many entries have been added. The expand chevron is
 * pinned to the right end by the `Collapse`'s `expandIconPosition`.
 */
function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: ReactNode;
  title: string;
  count?: number;
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
    </span>
  );
}

/**
 * The editor: collapsible section cards (spec §10.2), in the order the CV is
 * filled in. `Özünüzü qısa təsvir edin` lives inside "Ümumi məlumat".
 */
export function EditorPanel(): JSX.Element {
  const { t } = useTranslation();
  const resume = useResumeStore((s) => s.resume);
  // Which sections are open is persisted alongside the resume, so an accidental
  // refresh doesn't re-expand everything the user had collapsed.
  const openSections = useResumeStore((s) => s.openSections);
  const setOpenSections = useResumeStore((s) => s.setOpenSections);

  const items = [
    {
      key: 'basics',
      label: <SectionHeader icon={<FiUser aria-hidden />} title={t('sections.basics')} />,
      children: <BasicsSection />,
    },
    {
      key: 'generalInfo',
      label: <SectionHeader icon={<FiInfo aria-hidden />} title={t('sections.generalInfo')} />,
      children: <GeneralInfoSection />,
    },
    {
      key: 'contact',
      label: (
        <SectionHeader
          icon={<FiPhone aria-hidden />}
          title={t('sections.contact')}
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
          count={(resume.interests ?? []).length}
        />
      ),
      children: <InterestsSection />,
    },
  ];

  return (
    <VerticalFields>
      <Collapse
        items={items}
        activeKey={openSections ?? DEFAULT_OPEN_SECTIONS}
        onChange={(keys) => setOpenSections(Array.isArray(keys) ? keys : [keys])}
        expandIconPosition="end"
        style={{ background: 'transparent' }}
      />
    </VerticalFields>
  );
}
