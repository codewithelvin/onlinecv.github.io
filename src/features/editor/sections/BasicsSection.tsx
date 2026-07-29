import type { JSX } from 'react';
import { Col, Form, Input, Row, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../../../state/store';
import { LETTERS_AND_SPACE } from '../../../utils/patterns';
import { AvatarField } from '../../avatar/AvatarField';

function nameError(value: string, requiredKey: string): string | undefined {
  const v = value.trim();
  if (!v) return requiredKey;
  if (!LETTERS_AND_SPACE.test(v)) return 'onlyLettersAndSpace';
  if (v.length < 3) return 'minThreeChars';
  if (v.length > 50) return 'maximumFiftyCharacter';
  return undefined;
}

export function BasicsSection(): JSX.Element {
  const { t } = useTranslation();
  const basics = useResumeStore((s) => s.resume.basics);
  const update = useResumeStore((s) => s.updateBasics);

  const firstErr = nameError(basics.firstName, 'userFirstnameRequired');
  const lastErr = nameError(basics.lastName, 'userLastnameRequired');
  const headlineErr = !basics.headline.trim()
    ? 'cvTitleRequired'
    : basics.headline.trim().length > 50
      ? 'maximumFiftyCharacter'
      : undefined;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <AvatarField />
      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Form.Item
            label={t('fields.firstName')}
            required
            validateStatus={firstErr ? 'error' : ''}
            help={firstErr ? t(`validation.${firstErr}`) : undefined}
          >
            <Input value={basics.firstName} onChange={(e) => update({ firstName: e.target.value })} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            label={t('fields.lastName')}
            required
            validateStatus={lastErr ? 'error' : ''}
            help={lastErr ? t(`validation.${lastErr}`) : undefined}
          >
            <Input value={basics.lastName} onChange={(e) => update({ lastName: e.target.value })} />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item
        label={t('fields.headline')}
        required
        validateStatus={headlineErr ? 'error' : ''}
        help={headlineErr ? t(`validation.${headlineErr}`) : undefined}
      >
        <Input
          value={basics.headline}
          maxLength={50}
          placeholder={t('fields.headlinePlaceholder')}
          onChange={(e) => update({ headline: e.target.value })}
        />
      </Form.Item>
      <Form.Item label={t('fields.location')}>
        <Input
          value={basics.location ?? ''}
          maxLength={100}
          onChange={(e) => update({ location: e.target.value })}
        />
      </Form.Item>
    </Space>
  );
}
