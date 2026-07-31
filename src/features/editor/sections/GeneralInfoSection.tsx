import type { JSX } from "react";
import {
  AutoComplete,
  Col,
  DatePicker,
  Input,
  Row,
  Select,
  Space,
  theme,
} from "antd";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import type {
  Gender,
  LicenseCategory,
  MaritalStatus,
  MilitaryStatus,
} from "../../../types/resume";
import { useResumeStore } from "../../../state/store";
import { FULL_DATE, ISO_DATE, calcAge } from "../../../utils/date";
import { useDictionary } from "../../../hooks/useDictionary";
import { resolveDictionaryValue } from "../../../utils/dictionary";
import { Field } from "../../../components/form/fields";
import { useScopedId } from "../../../components/form/field-scope";
import {
  GENDERS,
  LICENSE_CATEGORIES,
  MARITAL_STATUSES,
  MILITARY_STATUSES,
  dictOptions,
  licenseOptions,
} from "../enums";

/** Max length of the short self-description (spec §16). */
const SUMMARY_MAX = 300;

/** General info + the short self-description (`Özünüzü qısa təsvir edin`). */
export function GeneralInfoSection(): JSX.Element {
  const { t } = useTranslation();
  const gi = useResumeStore((s) => s.resume.generalInfo);
  const update = useResumeStore((s) => s.updateGeneralInfo);
  const summary = useResumeStore((s) => s.resume.summary);
  const setSummary = useResumeStore((s) => s.updateSummary);
  const nationality = useDictionary("nationality");
  const { token } = theme.useToken();
  const ageId = useScopedId("dateOfBirth-age");

  const dob = gi.dateOfBirth ? dayjs(gi.dateOfBirth) : null;
  const age = calcAge(gi.dateOfBirth);
  const summaryTooLong = summary.length > SUMMARY_MAX;

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Field label={t("fields.gender")} name="gender" required>
            {(a11y) => (
              <Select
                {...a11y}
                value={gi.gender}
                placeholder={t("common.select")}
                options={dictOptions(GENDERS, t)}
                onChange={(v: Gender) => update({ gender: v })}
              />
            )}
          </Field>
        </Col>
        <Col xs={24} sm={12}>
          <Field
            label={t("fields.maritalStatus")}
            name="maritalStatus"
            required
          >
            {(a11y) => (
              <Select
                {...a11y}
                value={gi.maritalStatus}
                placeholder={t("common.select")}
                options={dictOptions(MARITAL_STATUSES, t)}
                onChange={(v: MaritalStatus) => update({ maritalStatus: v })}
              />
            )}
          </Field>
        </Col>
        <Col xs={24} sm={12}>
          {/* `generalInfo.nationality` holds a dictionary CODE when the value came
              from the list and raw text when it was typed (§13.1). Storing the
              code — not the label it was picked in — is what lets the CV re-label
              it on a language switch; `resolve` turns it back into text here, and
              anything unrecognized falls through unchanged. */}
          <Field label={t("fields.nationality")} name="nationality" required>
            {(a11y) => (
              <AutoComplete
                {...a11y}
                value={resolveDictionaryValue(
                  nationality.entries,
                  gi.nationality,
                  nationality.locale,
                )}
                options={nationality.options}
                onChange={(v) =>
                  update({ nationality: nationality.findByLabel(v)?.code ?? v })
                }
                filterOption={(input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            )}
          </Field>
        </Col>
        <Col xs={24} sm={12}>
          <Field label={t("fields.dateOfBirth")} name="dateOfBirth" required>
            {(a11y) => (
              <DatePicker
                {...a11y}
                style={{ width: "100%" }}
                format={FULL_DATE}
                value={dob && dob.isValid() ? dob : null}
                disabledDate={(d) => d.isAfter(dayjs())}
                /* Age is a read-out of the value, not a hint about the field, so
                   it sits inside the control rather than under it. Passing
                   `undefined` with no date restores antd's calendar icon — the
                   suffix slot is never empty, and an empty field shows no age.
                   `.ant-picker-suffix` is `pointer-events: none`, so clicking the
                   text still opens the panel; its default `colorTextQuaternary`
                   is icon-grey (3:1), hence the explicit description colour. */
                suffixIcon={
                  age !== null ? (
                    <span
                      id={ageId}
                      style={{
                        color: token.colorTextDescription,
                        fontSize: token.fontSizeSM,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {`${t("cvLabels.age")}: ${age}`}
                    </span>
                  ) : undefined
                }
                onChange={(d) =>
                  update({ dateOfBirth: d ? d.format(ISO_DATE) : "" })
                }
              />
            )}
          </Field>
        </Col>
        <Col xs={24} sm={12}>
          <Field label={t("fields.militaryStatus")} name="militaryStatus">
            {(a11y) => (
              <Select
                {...a11y}
                allowClear
                value={gi.militaryStatus}
                options={dictOptions(MILITARY_STATUSES, t)}
                onChange={(v: MilitaryStatus | undefined) =>
                  update({ militaryStatus: v })
                }
              />
            )}
          </Field>
        </Col>
        <Col xs={24} sm={12}>
          <Field label={t("fields.driverLicense")} name="driverLicense">
            {(a11y) => (
              <Select
                {...a11y}
                mode="multiple"
                allowClear
                value={gi.driverLicense ?? []}
                options={licenseOptions()}
                onChange={(v: LicenseCategory[]) =>
                  update({
                    driverLicense: v.filter((c) =>
                      LICENSE_CATEGORIES.includes(c),
                    ),
                  })
                }
              />
            )}
          </Field>
        </Col>
      </Row>
      {/* Keeps antd's default bottom margin: `showCount` renders the character
          counter BELOW the textarea, and with the margin zeroed it collided with
          the bottom edge of the accordion panel. */}
      <Field
        label={t("fields.summaryText")}
        name="summary"
        error={
          summaryTooLong
            ? t("validation.maximumThreeHundredCharacter")
            : undefined
        }
      >
        {(a11y) => (
          <Input.TextArea
            {...a11y}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={5}
            maxLength={SUMMARY_MAX}
            showCount
          />
        )}
      </Field>
    </Space>
  );
}
