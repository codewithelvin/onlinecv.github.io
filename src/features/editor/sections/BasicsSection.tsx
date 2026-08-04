import type { JSX } from 'react';
import { AutoComplete, Col, Input, Row, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../../../state/store';
import { PERSON_NAME } from '../../../utils/patterns';
import { useDictionary } from '../../../hooks/useDictionary';
import { searchKey } from '../../../utils/search';
import { DictionaryMatch, Field } from '../../../components/form/fields';
import { AvatarField } from '../../avatar/AvatarField';
import { FieldVisibility } from '../FieldVisibility';

/**
 * The editor's copy of `schemas.ts`'s `nameRule` — kept in step with it by hand,
 * including the absence of a MINIMUM length: a one-syllable Korean surname (김, 이)
 * is a whole name, and the `min(3)` that used to be here rejected it. See the
 * comment on `nameRule` for why the check was dropped rather than lowered.
 */
function nameError(value: string, requiredKey: string): string | undefined {
  const v = value.trim();
  if (!v) return requiredKey;
  if (!PERSON_NAME.test(v)) return 'onlyLettersAndSpace';
  if (v.length > 50) return 'maximumFiftyCharacter';
  return undefined;
}

export function BasicsSection(): JSX.Element {
  const { t } = useTranslation();
  const basics = useResumeStore((s) => s.resume.basics);
  const update = useResumeStore((s) => s.updateBasics);
  const cities = useDictionary('cities');

  const firstErr = nameError(basics.firstName, 'userFirstnameRequired');
  const lastErr = nameError(basics.lastName, 'userLastnameRequired');
  const headlineErr = !basics.headline.trim()
    ? 'cvTitleRequired'
    : basics.headline.trim().length > 50
      ? 'maximumFiftyCharacter'
      : undefined;
  const msg = (key: string | undefined): string | undefined =>
    key ? t(`validation.${key}`) : undefined;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <AvatarField />
      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Field label={t('fields.firstName')} name="firstName" required error={msg(firstErr)}>
            {(a11y) => (
              <Input
                {...a11y}
                value={basics.firstName}
                onChange={(e) => update({ firstName: e.target.value })}
              />
            )}
          </Field>
        </Col>
        <Col xs={24} sm={12}>
          <Field label={t('fields.lastName')} name="lastName" required error={msg(lastErr)}>
            {(a11y) => (
              <Input
                {...a11y}
                value={basics.lastName}
                onChange={(e) => update({ lastName: e.target.value })}
              />
            )}
          </Field>
        </Col>
        <Col xs={24} sm={12}>
          <Field label={t('fields.headline')} name="headline" required error={msg(headlineErr)}>
            {(a11y) => (
              <Input
                {...a11y}
                value={basics.headline}
                maxLength={50}
                placeholder={t('fields.headlinePlaceholder')}
                onChange={(e) => update({ headline: e.target.value })}
              />
            )}
          </Field>
        </Col>
        <Col xs={24} sm={12}>
          {/* City suggestions from the `cities` dictionary, free text still
              accepted (§13.1). The typed label is stored as-is and the resolved
              CODE alongside it — that code is what re-labels the city when the CV
              language changes, so what is shown here is derived from it. */}
          <Field
            label={t('fields.location')}
            name="location"
            extra={<FieldVisibility field="location" />}
          >
            {(a11y) => (
              <AutoComplete
                {...a11y}
                value={cities.resolve(basics.locationCode, basics.location ?? '')}
                options={cities.options}
                onChange={(v) => update({ location: v, locationCode: cities.findByLabel(v)?.code })}
                /* Case- AND diacritic-insensitive, so "seki" finds "Şəki" and
                   "istanbul" finds "İstanbul" — see `utils/search`. */
                filterOption={(input, option) => {
                  const needle = searchKey(input);
                  return needle === '' || searchKey(String(option?.label ?? '')).includes(needle);
                }}
              >
                <Input
                  maxLength={100}
                  suffix={
                    <DictionaryMatch
                      recognized={Boolean(basics.locationCode)}
                      title={t('fields.dictionaryMatch')}
                    />
                  }
                />
              </AutoComplete>
            )}
          </Field>
        </Col>
      </Row>
    </Space>
  );
}
