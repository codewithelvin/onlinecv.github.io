import { type JSX, useEffect, useState } from 'react';
import { Spin } from 'antd';
import type { ResumeTemplate } from '../../types/template';
import { useResumeStore } from '../../state/store';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { makeDateFormatter } from '../../utils/date';
import { getTemplate } from '../../templates/_core/registry';
import { i18n } from '../../app/i18n';
import { A4Frame } from './A4Frame';

/**
 * Live HTML preview of the selected template (spec §6/§19). Renders the SAME
 * component the PDF export uses — but as native HTML (no PDF engine while
 * editing). Debounced so typing stays responsive; headings use `resume.locale`.
 */
export function LivePreview(): JSX.Element {
  const resume = useDebouncedValue(useResumeStore((s) => s.resume));
  const templateId = resume.templateId;
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
    <A4Frame>
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
