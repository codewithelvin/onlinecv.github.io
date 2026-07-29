import type { JSX } from 'react';
import { AutoComplete, Col, DatePicker, Form, Row, Select, Space } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { Gender, LicenseCategory, MaritalStatus, MilitaryStatus } from '../../../types/resume';
import { useResumeStore } from '../../../state/store';
import { calcAge } from '../../../utils/date';
import { useDictionary } from '../../../hooks/useDictionary';
import {
  GENDERS,
  LICENSE_CATEGORIES,
  MARITAL_STATUSES,
  MILITARY_STATUSES,
  dictOptions,
  licenseOptions,
} from '../enums';

export function GeneralInfoSection(): JSX.Element {
  const { t } = useTranslation();
  const gi = useResumeStore((s) => s.resume.generalInfo);
  const update = useResumeStore((s) => s.updateGeneralInfo);
  const nationality = useDictionary('nationality');

  const dob = gi.dateOfBirth ? dayjs(gi.dateOfBirth) : null;
  const age = calcAge(gi.dateOfBirth);

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Form.Item label={t('fields.gender')} required>
            <Select
              value={gi.gender}
              options={dictOptions(GENDERS, t)}
              onChange={(v: Gender) => update({ gender: v })}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item label={t('fields.maritalStatus')} required>
            <Select
              value={gi.maritalStatus}
              options={dictOptions(MARITAL_STATUSES, t)}
              onChange={(v: MaritalStatus) => update({ maritalStatus: v })}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Form.Item label={t('fields.nationality')} required>
            <AutoComplete
              value={gi.nationality}
              options={nationality.options}
              onChange={(v) => update({ nationality: v })}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            label={t('fields.dateOfBirth')}
            required
            extra={age !== null ? `${t('cvLabels.age')}: ${age}` : undefined}
          >
            <DatePicker
              style={{ width: '100%' }}
              value={dob && dob.isValid() ? dob : null}
              disabledDate={(d) => d.isAfter(dayjs())}
              onChange={(d) => update({ dateOfBirth: d ? d.format('YYYY-MM-DD') : '' })}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Form.Item label={t('fields.militaryStatus')}>
            <Select
              allowClear
              value={gi.militaryStatus}
              options={dictOptions(MILITARY_STATUSES, t)}
              onChange={(v: MilitaryStatus | undefined) => update({ militaryStatus: v })}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item label={t('fields.driverLicense')}>
            <Select
              mode="multiple"
              allowClear
              value={gi.driverLicense ?? []}
              options={licenseOptions()}
              onChange={(v: LicenseCategory[]) =>
                update({ driverLicense: v.filter((c) => LICENSE_CATEGORIES.includes(c)) })
              }
            />
          </Form.Item>
        </Col>
      </Row>
    </Space>
  );
}
