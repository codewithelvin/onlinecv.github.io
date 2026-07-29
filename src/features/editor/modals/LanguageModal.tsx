import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ModalForm } from '../../../components/form/ModalForm';
import { RHFSelect } from '../../../components/form/fields';
import { yupResolver } from '../../../utils/yup-resolver';
import { languageSchema, type LanguageFormValues } from '../schemas';
import { LANGUAGE_LEVELS, dictOptions } from '../enums';
import { useDictionary } from '../../../hooks/useDictionary';
import type { ItemModalProps } from './types';

export function LanguageModal({
  open,
  title,
  defaultValues,
  onSubmit,
  onCancel,
}: ItemModalProps<LanguageFormValues>): JSX.Element {
  const { t } = useTranslation();
  const languages = useDictionary('languages');
  const { control, handleSubmit } = useForm<LanguageFormValues>({
    resolver: yupResolver<LanguageFormValues>(languageSchema),
    defaultValues,
  });
  return (
    <ModalForm open={open} title={title} onCancel={onCancel} onOk={handleSubmit(onSubmit)}>
      <RHFSelect
        control={control}
        name="code"
        label={t('fields.language')}
        options={languages.codeOptions}
      />
      <RHFSelect
        control={control}
        name="level"
        label={t('fields.languageLevel')}
        options={dictOptions(LANGUAGE_LEVELS, t)}
      />
    </ModalForm>
  );
}
