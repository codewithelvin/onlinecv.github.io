import type { JSX } from 'react';
import { AutoComplete, Checkbox, DatePicker, Form, Input, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import { type Control, type FieldPath, type FieldValues, useController } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

/**
 * Reusable React Hook Form ↔ Ant Design field bindings. Each resolves its
 * validation message (an i18n key under `validation.*`, spec §16) via
 * react-i18next, so errors localize automatically. Labels wrap, never truncate.
 */

interface BaseProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
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
  placeholder,
  maxLength,
  type,
}: BaseProps<T> & { placeholder?: string; maxLength?: number; type?: string }): JSX.Element {
  const { field } = useController({ control, name });
  const { message } = useError(control, name);
  return (
    <Form.Item label={label} validateStatus={message ? 'error' : ''} help={message}>
      <Input
        {...field}
        value={field.value ?? ''}
        type={type}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </Form.Item>
  );
}

export function RHFTextArea<T extends FieldValues>({
  control,
  name,
  label,
  maxLength,
  rows = 4,
  placeholder,
}: BaseProps<T> & { maxLength?: number; rows?: number; placeholder?: string }): JSX.Element {
  const { field } = useController({ control, name });
  const { message } = useError(control, name);
  return (
    <Form.Item label={label} validateStatus={message ? 'error' : ''} help={message}>
      <Input.TextArea
        {...field}
        value={field.value ?? ''}
        rows={rows}
        maxLength={maxLength}
        showCount={Boolean(maxLength)}
        placeholder={placeholder}
      />
    </Form.Item>
  );
}

export function RHFNumber<T extends FieldValues>({
  control,
  name,
  label,
  min,
  max,
}: BaseProps<T> & { min?: number; max?: number }): JSX.Element {
  const { field } = useController({ control, name });
  const { message } = useError(control, name);
  return (
    <Form.Item label={label} validateStatus={message ? 'error' : ''} help={message}>
      <InputNumber
        style={{ width: '100%' }}
        value={field.value as number}
        onChange={(v) => field.onChange(v)}
        onBlur={field.onBlur}
        min={min}
        max={max}
      />
    </Form.Item>
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
    <Form.Item label={label} validateStatus={message ? 'error' : ''} help={message}>
      <Select
        value={field.value ?? undefined}
        onChange={(v) => field.onChange(v)}
        onBlur={field.onBlur}
        options={options}
        allowClear={allowClear}
        placeholder={placeholder}
        mode={mode}
        showSearch
        optionFilterProp="label"
      />
    </Form.Item>
  );
}

/** AutoComplete with dictionary suggestions and free-text fallback (§13.1). */
export function RHFAutoComplete<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder,
}: BaseProps<T> & { options: Option[]; placeholder?: string }): JSX.Element {
  const { field } = useController({ control, name });
  const { message } = useError(control, name);
  return (
    <Form.Item label={label} validateStatus={message ? 'error' : ''} help={message}>
      <AutoComplete
        value={field.value ?? ''}
        onChange={(v) => field.onChange(v)}
        onBlur={field.onBlur}
        options={options}
        placeholder={placeholder}
        filterOption={(input, option) =>
          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
      />
    </Form.Item>
  );
}

/** DatePicker bound to an ISO string. `picker="month"` stores `YYYY-MM`, else `YYYY-MM-DD`. */
export function RHFDate<T extends FieldValues>({
  control,
  name,
  label,
  picker,
  disabledFuture,
}: BaseProps<T> & { picker?: 'month'; disabledFuture?: boolean }): JSX.Element {
  const { field } = useController({ control, name });
  const { message } = useError(control, name);
  const format = picker === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';
  const value = field.value ? dayjs(field.value as string) : null;
  return (
    <Form.Item label={label} validateStatus={message ? 'error' : ''} help={message}>
      <DatePicker
        style={{ width: '100%' }}
        picker={picker}
        value={value && value.isValid() ? value : null}
        onChange={(d) => field.onChange(d ? d.format(format) : '')}
        onBlur={field.onBlur}
        disabledDate={disabledFuture ? (d) => d.isAfter(dayjs()) : undefined}
      />
    </Form.Item>
  );
}

export function RHFCheckbox<T extends FieldValues>({
  control,
  name,
  label,
}: BaseProps<T>): JSX.Element {
  const { field } = useController({ control, name });
  return (
    <Form.Item>
      <Checkbox checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)}>
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
  rows = 4,
}: BaseProps<T> & { rows?: number }): JSX.Element {
  const { field } = useController({ control, name });
  const { message } = useError(control, name);
  const text = Array.isArray(field.value) ? (field.value as string[]).join('\n') : '';
  return (
    <Form.Item label={label} validateStatus={message ? 'error' : ''} help={message}>
      <Input.TextArea
        rows={rows}
        value={text}
        onChange={(e) => field.onChange(e.target.value.split('\n'))}
        onBlur={field.onBlur}
      />
    </Form.Item>
  );
}
