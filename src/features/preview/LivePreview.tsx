import { type JSX, useEffect, useState } from 'react';
import { Spin } from 'antd';
import type { ResumeTemplate } from '../../types/template';
import { useResumeStore } from '../../state/store';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocalizedResume } from '../../hooks/useLocalizedResume';
import { makeDateFormatter } from '../../utils/date';
import { ATTRIBUTION_TEXT, attributionPreviewStyle, showAttribution } from '../../utils/attribution';
import { getTemplate } from '../../templates/_core/registry';
import { i18n } from '../../app/i18n';
import { A4Frame } from './A4Frame';

/**
 * Live HTML preview of the selected template (spec §6/§19). Renders the SAME
 * component the PDF export uses — but as native HTML (no PDF engine while
 * editing). Debounced so typing stays responsive; headings use `resume.locale`,
 * as do dictionary-backed labels (see `useLocalizedResume`).
 */
export function LivePreview(): JSX.Element {
  const stored = useDebouncedValue(useResumeStore((s) => s.resume));
  const resume = useLocalizedResume(stored, stored.locale);
  const templateId = resume.templateId;
  // Page margins are metadata, not markup: the same numbers go to react-pdf's
  // `Page` on export, so preview and PDF keep the identical text area.
  const pageMargin = getTemplate(templateId).manifest.pageMargin;
  const [Template, setTemplate] = useState<ResumeTemplate | null>(null);

  useEffect(() => {
    let active = true;
    void getTemplate(templateId)
      .load()
      .then((mod) => {
        if (active) setTemplate(() => mod.default);
      });
    return () => {
      active = false;
    };
  }, [templateId]);

  const t = i18n.getFixedT(resume.locale);
  const formatDate = makeDateFormatter(resume.locale);

  return (
    <A4Frame
      pageMargin={pageMargin}
      // Rendered by the FRAME, not by the template: every template — including
      // ones added later — then carries the credit without implementing it, and
      // it stays out of the `TemplateProps` contract (spec §7.1).
      footer={
        showAttribution(resume) ? (
          <div style={attributionPreviewStyle}>{ATTRIBUTION_TEXT}</div>
        ) : undefined
      }
    >
      {Template ? (
        <Template resume={resume} t={t} formatDate={formatDate} />
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spin />
        </div>
      )}
    </A4Frame>
  );
}
