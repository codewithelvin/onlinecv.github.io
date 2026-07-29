import { type JSX, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ModalForm } from '../../../components/form/ModalForm';
import { RHFSelect } from '../../../components/form/fields';
import { yupResolver } from '../../../utils/yup-resolver';
import { languageSchema, type LanguageFormValues } from '../schemas';
import { LANGUAGE_LEVELS, dictOptions } from '../enums';
import { useDictionary } from '../../../hooks/useDictionary';
import type { ItemModalProps } from './types';

/**
 * A language can appear only once on a CV, so codes already on the list are
 * dropped from the picker (the row being edited keeps its own code, otherwise
 * editing only its level would leave the select empty).
 */
export function LanguageModal({
  open,
  title,
  defaultValues,
  onSubmit,
  onCancel,
  usedCodes = [],
}: ItemModalProps<LanguageFormValues> & { usedCodes?: string[] }): JSX.Element {
  const { t } = useTranslation();
  const languages = useDictionary('languages');
  const { control, handleSubmit } = useForm<LanguageFormValues>({
    resolver: yupResolver<LanguageFormValues>(languageSchema),
    defaultValues,
  });

  const options = useMemo(() => {
    const taken = new Set(usedCodes.filter((code) => code !== defaultValues.code));
    return languages.codeOptions.filter((o) => !taken.has(o.value));
  }, [languages.codeOptions, usedCodes, defaultValues.code]);

  return (
    <ModalForm open={open} title={title} onCancel={onCancel} onOk={handleSubmit(onSubmit)}>
      <RHFSelect
        control={control}
        name="code"
        label={t('fields.language')}
        options={options}
        required
      />
      <RHFSelect
        control={control}
        name="level"
        label={t('fields.languageLevel')}
        options={dictOptions(LANGUAGE_LEVELS, t)}
        required
      />
    </ModalForm>
  );
}
