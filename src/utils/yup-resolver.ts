import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import type { AnyObjectSchema, ValidationError } from 'yup';

/** Assign `value` at a dot-path inside `target`, creating intermediate objects. */
function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let node = target;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    if (typeof node[key] !== 'object' || node[key] === null) node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  node[keys[keys.length - 1]] = value;
}

/**
 * A minimal React Hook Form resolver backed by yup. Written in-house so we don't
 * add `@hookform/resolvers` (spec §27: no unapproved libraries). Validates with
 * `abortEarly: false` and maps yup errors to RHF's nested `FieldErrors` shape;
 * each `message` holds the bare i18n error key resolved by the form (spec §16).
 */
export function yupResolver<T extends FieldValues>(schema: AnyObjectSchema): Resolver<T> {
  return async (values) => {
    try {
      const result = await schema.validate(values, { abortEarly: false });
      return { values: result as T, errors: {} };
    } catch (e) {
      const validationError = e as ValidationError;
      const errors: Record<string, unknown> = {};
      for (const inner of validationError.inner) {
        if (inner.path) {
          setPath(errors, inner.path, {
            type: inner.type ?? 'validation',
            message: inner.message,
          });
        }
      }
      return { values: {}, errors: errors as FieldErrors<T> };
    }
  };
}
