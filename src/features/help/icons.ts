import type { IconType } from 'react-icons';
import {
  FiAward,
  FiBookOpen,
  FiBriefcase,
  FiDownload,
  FiEdit3,
  FiEye,
  FiFolder,
  FiGlobe,
  FiHelpCircle,
  FiLayout,
  FiLock,
  FiPhone,
  FiPlayCircle,
  FiSave,
  FiSmartphone,
  FiStar,
  FiUser,
  FiUserCheck,
} from 'react-icons/fi';
import type { HelpTopicId } from './topics';

/**
 * The icon each guide topic is listed with.
 *
 * Split out of `./topics` so the build-time page generator never pulls React in —
 * see the note there.
 *
 * A total `Record`, so a topic added to `HELP_TOPICS` fails to compile until it has
 * an icon, the same forcing function `LOCALES` uses. Where a topic documents an
 * editor section the icon is deliberately the SAME one that section carries in the
 * accordion (`EditorPanel`), so the guide's list and the editor's list read as the
 * same nine things rather than two parallel vocabularies.
 */
export const HELP_TOPIC_ICONS: Record<HelpTopicId, IconType> = {
  start: FiPlayCircle,
  wizard: FiUserCheck,
  editor: FiEdit3,
  basics: FiUser,
  contact: FiPhone,
  experience: FiBriefcase,
  education: FiBookOpen,
  certifications: FiAward,
  skills: FiStar,
  languages: FiGlobe,
  projects: FiFolder,
  templates: FiLayout,
  export: FiDownload,
  backup: FiSave,
  install: FiSmartphone,
  privacy: FiLock,
  writing: FiEye,
  faq: FiHelpCircle,
};
