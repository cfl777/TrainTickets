/**
 * The error summary of the GOV.UK / NL Design System form pattern. Goals:
 *
 * - One box lists every error after a submit, each as a link that focuses
 *   its field (3.3.1, 3.3.3).
 * - role="alert" so it is announced; focus moves to it on every failed
 *   attempt, including repeat failures with identical errors, which is
 *   what the attempt counter is for (2.4.3).
 * - Field order is fixed by the form, not by object key order.
 */
import { useEffect, useRef } from "react";
import { formStrings } from "../model/strings.ts";
import type { JourneyField, ValidationErrors } from "../model/validation.ts";
import styles from "./ErrorSummary.module.css";

const FIELD_ORDER: readonly JourneyField[] = [
  "origin",
  "destination",
  "date",
  "passengers",
];

type Props = Readonly<{
  errors: ValidationErrors;
  attempt: number;
}>;

export function ErrorSummary({ errors, attempt }: Props) {
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    summaryRef.current?.focus();
  }, [attempt]);

  const items = FIELD_ORDER.flatMap((field) => {
    const message = errors[field];
    return message === undefined ? [] : [{ field, message }];
  });

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={styles.summary} role="alert" tabIndex={-1} ref={summaryRef}>
      <h2 className={styles.heading}>{formStrings.summaryHeading}</h2>
      <ul className={styles.list}>
        {items.map(({ field, message }) => (
          <li key={field}>
            <a
              href={`#${field}`}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(field)?.focus();
              }}
            >
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
