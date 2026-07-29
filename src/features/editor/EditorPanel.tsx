import type { JSX } from 'react';
import { Collapse } from 'antd';
import { useTranslation } from 'react-i18next';
import { BasicsSection } from './sections/BasicsSection';
import { GeneralInfoSection } from './sections/GeneralInfoSection';
import { ContactSection } from './sections/ContactSection';
import { SummarySection } from './sections/SummarySection';
import { ExperienceSection } from './sections/ExperienceSection';
import { ProjectsSection } from './sections/ProjectsSection';
import { EducationSection } from './sections/EducationSection';
import { SkillsSection } from './sections/SkillsSection';
import { LanguagesSection } from './sections/LanguagesSection';
import { CertificationsSection } from './sections/CertificationsSection';
import { InterestsSection } from './sections/InterestsSection';

/** The editor: collapsible section cards (spec §10.2). */
export function EditorPanel(): JSX.Element {
  const { t } = useTranslation();
  const items = [
    { key: 'basics', label: t('sections.basics'), children: <BasicsSection /> },
    { key: 'generalInfo', label: t('sections.generalInfo'), children: <GeneralInfoSection /> },
    { key: 'contact', label: t('sections.contact'), children: <ContactSection /> },
    { key: 'summary', label: t('sections.summary'), children: <SummarySection /> },
    { key: 'experience', label: t('sections.experience'), children: <ExperienceSection /> },
    { key: 'projects', label: t('sections.projects'), children: <ProjectsSection /> },
    { key: 'education', label: t('sections.education'), children: <EducationSection /> },
    { key: 'skills', label: t('sections.skills'), children: <SkillsSection /> },
    { key: 'languages', label: t('sections.languages'), children: <LanguagesSection /> },
    { key: 'certifications', label: t('sections.certifications'), children: <CertificationsSection /> },
    { key: 'interests', label: t('sections.interests'), children: <InterestsSection /> },
  ];
  return (
    <Collapse
      items={items}
      defaultActiveKey={['basics', 'contact', 'summary', 'experience']}
      style={{ background: 'transparent' }}
    />
  );
}
