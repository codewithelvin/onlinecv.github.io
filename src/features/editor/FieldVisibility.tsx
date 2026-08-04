import type { JSX } from 'react';
import { Checkbox } from 'antd';
import { useTranslation } from 'react-i18next';
import type { HideableField } from '../../types/resume';
import { useResumeStore } from '../../state/store';
import { isFieldVisible } from '../../utils/field-visibility';
import { useScopedId } from '../../components/form/field-scope';

/**
 * "Show in CV" for one personal-details field, rendered directly under its input
 * (`Field`'s `extra` slot) so there is no list of field names to map back onto the
 * form.
 *
 * Unchecking keeps the value in the editor and takes it off the CV — both the live
 * preview and the exported PDF, which are one artifact seen two ways. Name,
 * surname and CV title have no toggle: see `HideableField`.
 *
 * The id follows the field's own (`#generalInfo-maritalStatus-visible`), so the
 * QA-id contract extends to the toggles without a second naming scheme.
 */
export function FieldVisibility({ field }: { field: HideableField }): JSX.Element {
  const { t } = useTranslation();
  const visible = useResumeStore((s) => isFieldVisible(s.resume, field));
  const setFieldVisible = useResumeStore((s) => s.setFieldVisible);
  const id = useScopedId(`${field}-visible`);

  return (
    <Checkbox
      id={id}
      // Readable state for automation, which would otherwise have to infer it
      // from the checkbox's rendered tick.
      data-field-visible={visible}
      checked={visible}
      onChange={(e) => setFieldVisible(field, e.target.checked)}
    >
      {t('fields.showInCv')}
    </Checkbox>
  );
}
