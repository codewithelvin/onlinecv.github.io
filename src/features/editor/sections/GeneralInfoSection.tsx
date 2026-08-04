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
  MaritalStatus,
  MilitaryStatus,
} from "../../../types/resume";
import { useResumeStore } from "../../../state/store";
import {
  FULL_DATE,
  ISO_DATE,
  calcAge,
  datePlaceholder,
  dobPickerStart,
} from "../../../utils/date";
import { useDictionary } from "../../../hooks/useDictionary";
import { resolveDictionaryValue } from "../../../utils/dictionary";
import { searchKey } from "../../../utils/search";
import { toLocale } from "../../../app/i18n/locales";
import { DictionaryMatch, Field } from "../../../components/form/fields";
import { useScopedId } from "../../../components/form/field-scope";
import { FieldVisibility } from "../FieldVisibility";
import {
  GENDERS,
  MARITAL_STATUSES,
  MILITARY_STATUSES,
  dictOptions,
  licenseOptions,
  normalizeLicenseCategories,
} from "../enums";

/** Max length of the short self-description (spec §16). */
const SUMMARY_MAX = 300;

/** General info + the short self-description (`Özünüzü qısa təsvir edin`). */
export function GeneralInfoSection(): JSX.Element {
  const { t, i18n } = useTranslation();
  const uiLocale = toLocale(i18n.language);
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
          <Field
            label={t("fields.gender")}
            name="gender"
            required
            extra={<FieldVisibility field="gender" />}
          >
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
          {/* Not required (and clearable): plenty of people would rather not
              state it at all, and the CV omits the row when it is empty. */}
          <Field
            label={t("fields.maritalStatus")}
            name="maritalStatus"
            extra={<FieldVisibility field="maritalStatus" />}
          >
            {(a11y) => (
              <Select
                {...a11y}
                allowClear
                value={gi.maritalStatus}
                placeholder={t("common.select")}
                options={dictOptions(MARITAL_STATUSES, t)}
                onChange={(v: MaritalStatus | undefined) =>
                  update({ maritalStatus: v })
                }
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
          <Field
            label={t("fields.nationality")}
            name="nationality"
            extra={<FieldVisibility field="nationality" />}
          >
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
                /* The LAST call site that still filtered with a plain
                   `toLowerCase()`, and it had the same defect the rest were fixed
                   for: `İ` lower-cases to `i` plus a combining dot, so typing
                   "it" could not find "İtalyan". See `utils/search`. */
                filterOption={(input, option) => {
                  const needle = searchKey(input);
                  return (
                    needle === "" ||
                    searchKey(String(option?.label ?? "")).includes(needle)
                  );
                }}
              >
                {/* A recognized nationality is stored as a dictionary CODE and
                    re-labels itself on a language switch; free text does not.
                    The tick is the only way to tell the two apart.

                    The a11y props stay on the AutoComplete above: rc-select
                    clones a customize-input child and OVERWRITES its `id` with
                    its own (measured — an `id` set here is silently replaced by
                    `rc_select_*`, which detaches the `<label for>`). It
                    propagates the id and the aria attributes from the select down
                    to this input instead, so the child keeps only presentation. */}
                <Input
                  suffix={
                    <DictionaryMatch
                      recognized={Boolean(
                        nationality.findByCode(gi.nationality),
                      )}
                      title={t("fields.dictionaryMatch")}
                    />
                  }
                />
              </AutoComplete>
            )}
          </Field>
        </Col>
        <Col xs={24} sm={12}>
          <Field
            label={t("fields.dateOfBirth")}
            name="dateOfBirth"
            required
            extra={<FieldVisibility field="dateOfBirth" />}
          >
            {(a11y) => (
              <DatePicker
                {...a11y}
                style={{ width: "100%" }}
                format={FULL_DATE}
                /* Advertises that the field is typeable, and opens the panel a
                   generation back instead of on today — a birthday is never
                   near the current month. See `utils/date`. */
                placeholder={datePlaceholder(FULL_DATE, uiLocale)}
                defaultPickerValue={dobPickerStart()}
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
          <Field
            label={t("fields.militaryStatus")}
            name="militaryStatus"
            extra={<FieldVisibility field="militaryStatus" />}
          >
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
          <Field
            label={t("fields.driverLicense")}
            name="driverLicense"
            extra={<FieldVisibility field="driverLicense" />}
          >
            {/* `tags`, not `multiple`: the shipped categories are the
                Azerbaijani set and licence categories are not the same in every
                country (Russia's `M`/`Tm`/`Tb`, the EU's `A2`/`C1E`, Israel's
                `D2`/`D3`, and the Arab systems have no letters at all), so the
                list can only suggest — §13.1. See `GeneralInfo.driverLicense`. */}
            {(a11y) => (
              <Select
                {...a11y}
                mode="tags"
                allowClear
                placeholder={t("common.selectOrType")}
                value={gi.driverLicense ?? []}
                options={licenseOptions()}
                onChange={(v: string[]) =>
                  update({ driverLicense: normalizeLicenseCategories(v) })
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
        extra={<FieldVisibility field="summary" />}
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
