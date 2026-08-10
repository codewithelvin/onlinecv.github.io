import { type JSX, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ModalForm } from '../../../components/form/ModalForm';
import { RHFAutoComplete, RHFSelect } from '../../../components/form/fields';
import { searchKey } from '../../../utils/search';
import { yupResolver } from '../../../utils/yup-resolver';
import { languageSchema, type LanguageFormValues } from '../schemas';
import { LANGUAGE_LEVELS, dictOptions } from '../enums';
import { useDictionary } from '../../../hooks/useDictionary';
import type { ItemModalProps } from './types';

/**
 * A language can appear only once on a CV, so the ones already listed are
 * dropped from the suggestions (the row being edited keeps its own, otherwise
 * changing only its level would empty the field).
 *
 * The control is an AUTOCOMPLETE, not a select: the dictionary carries the
 * world's major languages but can never carry all of them, and the previous
 * hard-constrained select meant a speaker of anything unlisted simply could not
 * put their own language on their CV. Picking a suggestion still stores a
 * dictionary `code`, which is what re-labels the entry when the CV language
 * changes; typing something else stores the text as written and leaves it alone
 * (§13.1, and §10.1 — user prose is never translated).
 */
export function LanguageModal({
  open,
  title,
  defaultValues,
  onSubmit,
  onCancel,
  usedNames = [],
}: ItemModalProps<LanguageFormValues> & {
  /** Languages already on the CV, as displayed — see `options` below. */
  usedNames?: string[];
}): JSX.Element {
  const { t } = useTranslation();
  const languages = useDictionary('languages');
  const { control, handleSubmit, watch } = useForm<LanguageFormValues>({
    resolver: yupResolver<LanguageFormValues>(languageSchema),
    defaultValues,
  });
  const name = watch('name');

  /**
   * Compared through `searchKey`, the same fold the dropdown searches and
   * `findByLabel` resolves with, so "ingilis dili" typed without the dotted
   * capital still counts as the row that is already on the CV.
   */
  const options = useMemo(() => {
    const taken = new Set(
      usedNames.filter((n) => searchKey(n) !== searchKey(defaultValues.name)).map(searchKey),
    );
    return languages.options.filter((o) => !taken.has(searchKey(o.value)));
  }, [languages.options, usedNames, defaultValues.name]);

  const submit = handleSubmit((values) => {
    const entry = languages.findByLabel(values.name);
    onSubmit({ ...values, name: values.name.trim(), code: entry?.code });
  });

  return (
    <ModalForm open={open} title={title} onCancel={onCancel} onOk={submit}>
      <RHFAutoComplete
        control={control}
        name="name"
        label={t('fields.language')}
        options={options}
        recognized={Boolean(name && languages.findByLabel(name))}
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
