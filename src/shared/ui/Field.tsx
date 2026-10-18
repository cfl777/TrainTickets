/**
 * Label, control, hint and error wiring, once for every field. Goals:
 *
 * - The control is rendered by the caller through a function that receives
 *   the id and aria attributes, so Field never knows the input type.
 * - aria-describedby lists the hint and, when present, the error;
 *   aria-invalid is set only while there is an error (3.3.1, 3.3.3, 4.1.2).
 * - The error message sits directly under the control it belongs to.
 * - Ids come from useId unless given, so a parent can focus a field by a
 *   known id.
 * - An optional decorative icon sits inside the control; it is hidden from
 *   assistive tech, the label carries the meaning.
 */
import { useId, type ReactNode } from "react";
import styles from "./Field.module.css";

type ControlProps = Readonly<{
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}>;

type FieldProps = Readonly<{
  label: string;
  hint?: string;
  error?: string;
  id?: string;
  icon?: ReactNode;
  children: (control: ControlProps) => ReactNode;
}>;

export function Field({ label, hint, error, id, icon, children }: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;

  const describedBy = [
    hint === undefined ? null : hintId,
    error === undefined ? null : errorId,
  ]
    .filter((value): value is string => value !== null)
    .join(" ");

  const control: ControlProps = {
    id: controlId,
    ...(describedBy.length > 0 ? { "aria-describedby": describedBy } : {}),
    ...(error === undefined ? {} : { "aria-invalid": true as const }),
  };

  // CSS module keys are string | undefined under noUncheckedIndexedAccess.
  const className =
    error === undefined
      ? styles.field
      : `${styles.field ?? ""} ${styles.hasError ?? ""}`;

  return (
    <div className={className}>
      <label className={styles.label} htmlFor={controlId}>
        {label}
      </label>
      {hint === undefined ? null : (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      )}
      {icon === undefined ? (
        children(control)
      ) : (
        <div className={styles.control}>
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
          {children(control)}
        </div>
      )}
      {error === undefined ? null : (
        <p className={styles.error} id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
