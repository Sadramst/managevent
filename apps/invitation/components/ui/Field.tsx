import { type ComponentProps, type ReactNode, useId } from "react";
import { cx } from "@managevent/ui/brand";

/** One message or several (the shape of `ActionFailure.fieldErrors[name]`). */
export type FieldError = string | readonly string[] | null | undefined;

function errorText(error: FieldError): string | null {
  if (!error) return null;
  const text = typeof error === "string" ? error : error.join(" ");
  return text.trim().length > 0 ? text : null;
}

export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

/**
 * The attributes that tie a control to its `Field`: the id the label points at, and
 * `aria-describedby` / `aria-invalid` for the hint and error. Spread it on the control:
 *
 *   <Field id="venue" label="Venue" error={errors.venue}>
 *     <input name="venue" {...fieldControlProps("venue", { error: errors.venue })} />
 *   </Field>
 */
export function fieldControlProps(
  id: string,
  state: { hint?: ReactNode; error?: FieldError } = {},
): FieldControlProps {
  const hasError = errorText(state.error) !== null;
  const describedBy = [state.hint ? `${id}-hint` : null, hasError ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");
  return {
    id,
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
    ...(hasError ? { "aria-invalid": true as const } : {}),
  };
}

export interface FieldProps {
  /** The id of the control. The hint (`{id}-hint`) and error (`{id}-error`) derive from it. */
  id: string;
  label: ReactNode;
  /** Help text under the label, read out with the control. */
  hint?: ReactNode;
  /** Validation message. When set, the control should also get `aria-invalid`. */
  error?: FieldError;
  /** The word shown beside the label of an optional field, e.g. "optional" (from i18n). */
  optional?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}

/**
 * Label + control + hint + error, in the brand `.field` stack. Works in server and client
 * components. For plain inputs prefer `TextField`, `TextAreaField` or `SelectField`.
 */
export function Field({ id, label, hint, error, optional, className, children }: FieldProps) {
  const message = errorText(error);
  return (
    <div className={cx("field", className)}>
      <label className="label" htmlFor={id}>
        {label}
        {optional ? <span className="label-optional"> ({optional})</span> : null}
      </label>
      {hint ? (
        <p className="help" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {children}
      {message ? (
        <p className="error" id={`${id}-error`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

interface SharedFieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: FieldError;
  optional?: string | undefined;
  /** Class for the `.field` wrapper (the control keeps `className`). */
  fieldClassName?: string | undefined;
}

function wrapperProps(shared: SharedFieldProps, id: string): Omit<FieldProps, "children"> {
  return {
    id,
    label: shared.label,
    hint: shared.hint,
    error: shared.error,
    optional: shared.optional,
    className: shared.fieldClassName,
  };
}

export type TextFieldProps = SharedFieldProps & ComponentProps<"input">;

/** A labelled `<input>`. Every input attribute (and `ref`) passes through. */
export function TextField({
  label,
  hint,
  error,
  optional,
  fieldClassName,
  id,
  ...input
}: TextFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  return (
    <Field {...wrapperProps({ label, hint, error, optional, fieldClassName }, controlId)}>
      <input {...input} {...fieldControlProps(controlId, { hint, error })} />
    </Field>
  );
}

export type TextAreaFieldProps = SharedFieldProps & ComponentProps<"textarea">;

/** A labelled `<textarea>`. */
export function TextAreaField({
  label,
  hint,
  error,
  optional,
  fieldClassName,
  id,
  ...textarea
}: TextAreaFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  return (
    <Field {...wrapperProps({ label, hint, error, optional, fieldClassName }, controlId)}>
      <textarea {...textarea} {...fieldControlProps(controlId, { hint, error })} />
    </Field>
  );
}

export type SelectFieldProps = SharedFieldProps & ComponentProps<"select">;

/** A labelled `<select>`; pass `<option>` elements as children. */
export function SelectField({
  label,
  hint,
  error,
  optional,
  fieldClassName,
  id,
  children,
  ...select
}: SelectFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  return (
    <Field {...wrapperProps({ label, hint, error, optional, fieldClassName }, controlId)}>
      <select {...select} {...fieldControlProps(controlId, { hint, error })}>
        {children}
      </select>
    </Field>
  );
}
