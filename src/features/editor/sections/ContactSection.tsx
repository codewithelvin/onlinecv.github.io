import { type JSX, useState } from 'react';
import { Input, Space } from 'antd';
import { Button } from 'antd';
import { FiPlus } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import type { ContactItem, ContactType } from '../../../types/resume';
import { useResumeStore } from '../../../state/store';
import { VALUE_DIR } from '../../../utils/bidi';
import { createId } from '../../../utils/id';
import { useScopedId } from '../../../components/form/field-scope';
import { Field } from '../../../components/form/fields';
import { ItemList } from '../../../components/ItemList';
import { ContactModal } from '../modals/ContactModal';
import type { ContactFormValues } from '../schemas';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactSection(): JSX.Element {
  const { t } = useTranslation();
  const email = useResumeStore((s) => s.resume.contact.email);
  const items = useResumeStore((s) => s.resume.contact.items);
  const setEmail = useResumeStore((s) => s.updateContactEmail);
  const addContact = useResumeStore((s) => s.addContactItem);
  const updateContact = useResumeStore((s) => s.updateContactItem);
  const removeContact = useResumeStore((s) => s.removeContactItem);

  const addId = useScopedId('add');
  const [index, setIndex] = useState<number | null>(null);
  const editing = index !== null && index >= 0 ? items[index] ?? null : null;
  const isAdding = index === -1;

  const emailError = !email.trim()
    ? t('validation.enterValidEmail')
    : !EMAIL_RE.test(email)
      ? t('validation.enterValidEmail')
      : undefined;

  const onSubmit = (v: ContactFormValues): void => {
    const item: ContactItem = { id: editing?.id ?? createId(), type: v.type as ContactType, value: v.value.trim() };
    if (isAdding) addContact(item);
    else if (editing) updateContact(editing.id, item);
    setIndex(null);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Field
        label={t('fields.email')}
        name="email"
        required
        error={emailError}
        style={{ marginBottom: 0 }}
      >
        {(a11y) => (
          <Input
            {...a11y}
            type="email"
            dir={VALUE_DIR}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>

      <ItemList
        ids={items.map((c) => c.id)}
        titles={items.map((c) => t(`dictionary.${c.type}`))}
        /* The saved value is read back under the same rule it was typed under:
           a phone number reads left-to-right in a right-to-left UI, an address
           follows its own script. See `utils/bidi`. */
        subtitles={items.map((c) => (c.value ? <span dir={VALUE_DIR}>{c.value}</span> : ''))}
        onEdit={(i) => setIndex(i)}
        onRemove={(i) => removeContact(items[i].id)}
      />

      <Button id={addId} icon={<FiPlus aria-hidden />} onClick={() => setIndex(-1)} block>
        {t('common.add')}
      </Button>

      {index !== null ? (
        <ContactModal
          key={index}
          open
          title={isAdding ? t('sections.contact') : t('common.edit')}
          defaultValues={{ type: editing?.type ?? 'mobile', value: editing?.value ?? '' }}
          onSubmit={onSubmit}
          onCancel={() => setIndex(null)}
        />
      ) : null}
    </Space>
  );
}
