import type { CSSProperties, JSX, ReactNode } from 'react';
import { useContext, useId } from 'react';
import {
  AutoComplete,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Slider,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { FiCheck } from 'react-icons/fi';
import { searchKey } from '../../utils/search';
import { type Control, type FieldPath, type FieldValues, useController } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toLocale } from '../../app/i18n/locales';
import { FULL_DATE, ISO_DATE, ISO_MONTH, MONTH_YEAR, datePlaceholder } from '../../utils/date';
import { FieldScopeContext, useScopedId } from './field-scope';

/**
 * Reusable React Hook Form ↔ Ant Design field bindings. Each resolves its
 * validation message (an i18n key under `validation.*`, spec §16) via
 * react-i18next, so errors localize automatically. Labels sit ABOVE the control
 * (see `VerticalFields`), wrap rather than truncate, and required fields carry
 * Ant Design's red asterisk.
 */

/**
 * Provides the Ant Design form context that puts every nested `Form.Item`'s
 * label above its control. `component={false}` means no `<form>` element is
 * rendered — these fields are driven by React Hook Form, not rc-field-form —
 * and the context reaches modals too, since React context flows through portals.
 */
export function VerticalFields({
  scope,
  children,
}: {
  /** Optional `FieldScope` around the fields — see `FieldScope` for the ids. */
  scope?: string;
  children: ReactNode;
}): JSX.Element {
  const form = (
    <Form layout="vertical" component={false} requiredMark>
      {children}
    </Form>
  );
  return scope ? <FieldScope name={scope}>{form}</FieldScope> : form;
}

/**
 * Provides the id namespace the controls below it are named in — see
 * `field-scope.ts` for why the ids are built this way. Scopes nest:
 * `<FieldScope name="basics">` inside `<FieldScope name="cv">` yields
 * `cv-basics-firstName`.
 */
export function FieldScope({ name, children }: { name: string; children: ReactNode }): JSX.Element {
  const parent = useContext(FieldScopeContext);
  return (
    <FieldScopeContext.Provider value={parent ? `${parent}-${name}` : name}>
      {children}
    </FieldScopeContext.Provider>
  );
}

/** Accessibility wiring handed to a `Field`'s control. */
export interface FieldControl {
  /** Put this on the control so the `<label for=…>` points at it. */
  id: string;
  /** Put this on the control so its error message is announced. */
  'aria-describedby': string | undefined;
  /** Put this on the control so the invalid state is announced. */
  'aria-invalid': boolean | undefined;
}

/**
 * `Form.Item` plus the label/error plumbing Ant Design only does for itself when
 * an item has a `name`. These items are layout-only — React Hook Form owns the
 * state — so antd generates no id, leaving every `<label>` detached from its
 * control ("Form elements do not have associated labels" in a Lighthouse /
 * axe audit). Generating an id here and handing it to the control via the
 * render prop wires up `for`/`id`, `aria-describedby` and `aria-invalid` for
 * every field in the app at once.
 */
export function Field({
  label,
  name,
  required,
  error,
  extra,
  style,
  children,
}: {
  label: string;
  /** Field name — becomes the control's DOM id within the current `FieldScope`. */
  name?: string;
  required?: boolean;
  error?: string;
  extra?: ReactNode;
  style?: CSSProperties;
  children: (control: FieldControl) => ReactNode;
}): JSX.Element {
  const generatedId = useId();
  const id = useScopedId(name) ?? generatedId;
  const helpId = `${id}-help`;
  return (
    <Form.Item
      label={label}
      htmlFor={id}
      required={required}
      validateStatus={error ? 'error' : ''}
      help={error ? <span id={helpId}>{error}</span> : undefined}
      extra={extra}
      style={style}
    >
      {children({
        id,
        'aria-describedby': error ? helpId : undefined,
        'aria-invalid': error ? true : undefined,
      })}
    </Form.Item>
  );
}

interface BaseProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  /** Renders the red asterisk. Mirror the field's yup rule (spec §16). */
  required?: boolean;
}

function useError<T extends FieldValues>(
  control: Control<T>,
  name: FieldPath<T>,
): { message?: string } {
  const {
    fieldState: { error },
  } = useController({ control, name });
  const { t } = useTranslation();
  return { message: error?.message ? t(`validation.${error.message}`) : undefined };
}

export function RHFText<T extends FieldValues>({
  control,
  name,
  label,
  required,
  placeholder,
  maxLength,
  type,
}: BaseProps<T> & { placeholder?: string; maxLength?: number; type?: string }): JSX.Element {
  const { field } = useController({ control, name });
  const { message } = useError(control, name);
  return (
    <Field label={label} name={name} required={required} error={message}>
      {(a11y) => (
        <Input
          {...field}
          {...a11y}
          value={field.value ?? ''}
          type={type}
          placeholder={placeholder}
          maxLength={maxLength}
        />
      )}
    </Field>
  );
}

export function RHFTextArea<T extends FieldValues>({
  control,
  name,
  label,
  required,
  maxLength,
  rows = 4,
  placeholder,
}: BaseProps<T> & { maxLength?: number; rows?: number; placeholder?: string }): JSX.Element {
  const { field } = useController({ control, name });
  const { message } = useError(control, name);
  return (
    <Field label={label} name={name} required={required} error={message}>
      {(a11y) => (
        <Input.TextArea
          {...field}
          {...a11y}
          value={field.value ?? ''}
          rows={rows}
          maxLength={maxLength}
          showCount={Boolean(maxLength)}
          placeholder={placeholder}
        />
      )}
    </Field>
  );
}

export function RHFNumber<T extends FieldValues>({
  control,
  name,
  label,
  required,
  min,
  max,
}: BaseProps<T> & { min?: number; max?: number }): JSX.Element {
  const { field } = useController({ control, name });
  const { message } = useError(control, name);
  return (
    <Field label={label} name={name} required={required} error={message}>
      {(a11y) => (
        <InputNumber
          {...a11y}
          style={{ width: '100%' }}
          value={field.value as number}
          onChange={(v) => field.onChange(v)}
          onBlur={field.onBlur}
          min={min}
          max={max}
        />
      )}
    </Field>
  );
}

/** Percentage-style 1–100 input as a slider with a synced numeric readout. */
export function RHFSlider<T extends FieldValues>({
  control,
  name,
  label,
  required,
  min = 1,
  max = 100,
  step = 1,
}: BaseProps<T> & { min?: number; max?: number; step?: number }): JSX.Element {
  const { field } = useController({ control, name });
  const { message } = useError(control, name);
  const value = typeof field.value === 'number' ? field.value : min;
  // The twin number box is the practical handle for automation (a slider can
  // only be driven by drag/arrow keys), so it gets an id of its own.
  const numberId = useScopedId(name ? `${name}-value` : undefined);
  return (
    <Field label={label} name={name} required={required} error={message}>
      {(a11y) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Slider
            {...a11y}
            // Horizontal margin is NOT decoration: the `min`/`max` mark labels are
            // centred on the track ends, so without it the "1" is clipped.
            style={{ flex: 1, minWidth: 0, margin: '0 10px' }}
            min={min}
            max={max}
            step={step}
            value={value}
            tooltip={{ formatter: (v) => `${v ?? min}%` }}
            onChange={(v) => field.onChange(v)}
            onChangeComplete={() => field.onBlur()}
            marks={{ [min]: `${min}`, 50: '50', [max]: `${max}` }}
          />
          {/* The label points at the slider, so the twin number box needs its own
              accessible name rather than sharing one. */}
          <InputNumber
            id={numberId}
            style={{ width: 78, flex: '0 0 auto' }}
            aria-label={label}
            min={min}
            max={max}
            step={step}
            value={value}
            suffix="%"
            onChange={(v) => field.onChange(v)}
            onBlur={field.onBlur}
          />
        </div>
      )}
    </Field>
  );
}

export interface Option {
  value: string;
  label: string;
}

export function RHFSelect<T extends FieldValues>({
  control,
  name,
  label,
  required,
  options,
  allowClear,
  placeholder,
  mode,
}: BaseProps<T> & {
  options: Option[];
  allowClear?: boolean;
  placeholder?: string;
  mode?: 'multiple';
}): JSX.Element {
  const { field } = useController({ control, name });
  const { message } = useError(control, name);
  return (
    <Field label={label} name={name} required={required} error={message}>
      {(a11y) => (
        <Select
          {...a11y}
          value={field.value ?? undefined}
          onChange={(v) => field.onChange(v)}
          onBlur={field.onBlur}
          options={options}
          allowClear={allowClear}
          placeholder={placeholder}
          mode={mode}
          showSearch
          /**
           * Same folding as the AutoComplete below, for the same reason:
           * `optionFilterProp="label"` does a plain case-insensitive match and
           * cannot find a label beginning with "İ".
           */
          filterOption={(input, option) => {
            const needle = searchKey(input);
            return needle === '' || searchKey(String(option?.label ?? '')).includes(needle);
          }}
        />
      )}
    </Field>
  );
}

/**
 * Ant Design's `colorSuccess` (`#52c41a`) is 2.4:1 on white and fails WCAG
 * 1.4.11's 3:1 floor for a meaningful graphic — the same reason `colorError` is
 * pinned in `app/theme.ts`. Green-6 clears it at 3.5:1.
 */
const DICTIONARY_MATCH_COLOR = '#389e0d';

/**
 * Marks an AutoComplete whose text resolves to a dictionary entry.
 *
 * These fields accept free text by design (§13.1), so the input looks identical
 * whether or not the value carries a dictionary code — and picking a suggestion
 * changes nothing on screen, because the text was already what the user typed.
 * That left the one thing worth knowing invisible: a recognized value stores the
 * CODE, which is what re-labels it when the CV language changes, while free text
 * stays frozen in the language it was typed in.
 *
 * The box is rendered at a fixed size whether or not the tick is in it, so
 * recognition appearing mid-typing never nudges the layout.
 */
export function DictionaryMatch({
  recognized,
  title,
}: {
  recognized: boolean;
  title: string;
}): JSX.Element {
  return (
    <span
      // Readable state, not just a picture: the tick is the only signal that a
      // value carries a dictionary code, so QA automation should be able to
      // assert it without recognizing an icon in a screenshot.
      data-dictionary-match={recognized}
      title={recognized ? title : undefined}
      style={{ display: 'inline-flex', width: 14, color: DICTIONARY_MATCH_COLOR }}
    >
      {recognized ? <FiCheck size={14} role="img" aria-label={title} /> : null}
    </span>
  );
}

/** AutoComplete with dictionary suggestions and free-text fallback (§13.1). */
export function RHFAutoComplete<T extends FieldValues>({
  control,
  name,
  label,
  required,
  options,
  placeholder,
  recognized = false,
}: BaseProps<T> & {
  options: Option[];
  placeholder?: string;
  /** Does the current text resolve to a dictionary entry? See `DictionaryMatch`. */
  recognized?: boolean;
}): JSX.Element {
  const { field } = useController({ control, name });
  const { message } = useError(control, name);
  const { t } = useTranslation();
  return (
    <Field label={label} name={name} required={required} error={message}>
      {(a11y) => (
        <AutoComplete
          {...a11y}
          value={field.value ?? ''}
          onChange={(v) => field.onChange(v)}
          onBlur={field.onBlur}
          options={options}
          /**
           * Case- AND diacritic-insensitive. A plain `toLowerCase()` could not
           * find "İsgəndəriyyə" from "is" — the dotted capital lower-cases to
           * `i` plus a combining dot — see `utils/search`. The needle is folded
           * once per keystroke, not once per option.
           */
          filterOption={(input, option) => {
            const needle = searchKey(input);
            return needle === '' || searchKey(String(option?.label ?? '')).includes(needle);
          }}
        >
          {/* A child input is the only way to reach a suffix: AutoComplete has
              none of its own. The a11y props deliberately stay on the
              AutoComplete rather than moving here — rc-select clones a
              customize-input child and OVERWRITES its `id` with its own
              (measured: an `id` set on this element is silently replaced by
              `rc_select_*`, which detaches the `<label for>` and broke every
              `#section-field` QA id). It propagates `id`, `aria-describedby` and
              `aria-invalid` from the select down to this input, so the child is
              left holding only presentation. */}
          <Input
            placeholder={placeholder}
            suffix={<DictionaryMatch recognized={recognized} title={t('fields.dictionaryMatch')} />}
          />
        </AutoComplete>
      )}
    </Field>
  );
}

/**
 * DatePicker bound to an ISO string. `picker="month"` stores `YYYY-MM` and
 * displays a localized `MMM YYYY`; otherwise it stores `YYYY-MM-DD` and
 * displays `DD.MM.YYYY` (spec §10.2). The week starts on Monday in every locale
 * (see `utils/date`).
 */
export function RHFDate<T extends FieldValues>({
  control,
  name,
  label,
  required,
  picker,
  disabledFuture,
  disabled,
  defaultPickerValue,
}: BaseProps<T> & {
  picker?: 'month';
  disabledFuture?: boolean;
  disabled?: boolean;
  /**
   * Which month the panel OPENS on while the field is empty — pass
   * `dobPickerStart()` for a date of birth. Sets no value; omit it and the panel
   * opens on today, which is right for everything near the present.
   */
  defaultPickerValue?: Dayjs;
}): JSX.Element {
  const { field } = useController({ control, name });
  const { message } = useError(control, name);
  const { i18n } = useTranslation();
  const isMonth = picker === 'month';
  const storeFormat = isMonth ? ISO_MONTH : ISO_DATE;
  const displayFormat = isMonth ? MONTH_YEAR : FULL_DATE;
  const value = field.value ? dayjs(field.value as string) : null;
  return (
    <Field label={label} name={name} required={required} error={message}>
      {(a11y) => (
        <DatePicker
          {...a11y}
          style={{ width: '100%' }}
          picker={picker}
          format={displayFormat}
          // Advertises that the field is typeable, which beats paging the panel
          // — see `datePlaceholder`.
          placeholder={datePlaceholder(displayFormat, toLocale(i18n.language))}
          disabled={disabled}
          value={value && value.isValid() ? value : null}
          defaultPickerValue={defaultPickerValue}
          onChange={(d) => field.onChange(d ? d.format(storeFormat) : '')}
          onBlur={field.onBlur}
          disabledDate={disabledFuture ? (d) => d.isAfter(dayjs()) : undefined}
        />
      )}
    </Field>
  );
}

/** The Checkbox wraps its own text, so the label is already associated. */
export function RHFCheckbox<T extends FieldValues>({
  control,
  name,
  label,
}: BaseProps<T>): JSX.Element {
  const { field } = useController({ control, name });
  const id = useScopedId(name);
  return (
    <Form.Item>
      <Checkbox
        id={id}
        checked={Boolean(field.value)}
        onChange={(e) => field.onChange(e.target.checked)}
      >
        {label}
      </Checkbox>
    </Form.Item>
  );
}

/** Multi-line textarea mapped to a `string[]` (one bullet per line). */
export function RHFLines<T extends FieldValues>({
  control,
  name,
  label,
  required,
  rows = 4,
}: BaseProps<T> & { rows?: number }): JSX.Element {
  const { field } = useController({ control, name });
  const { message } = useError(control, name);
  const text = Array.isArray(field.value) ? (field.value as string[]).join('\n') : '';
  return (
    <Field label={label} name={name} required={required} error={message}>
      {(a11y) => (
        <Input.TextArea
          {...a11y}
          rows={rows}
          value={text}
          onChange={(e) => field.onChange(e.target.value.split('\n'))}
          onBlur={field.onBlur}
        />
      )}
    </Field>
  );
}
