/**
 * The alert region of the results area, mounted only on error. Goals:
 *
 * - role="alert" so the failure is announced at once; focus moves to it,
 *   so keyboard and screen-reader users land on the message and the
 *   retry button (2.4.3).
 * - The retry calls back into the hook's refetch; no reload, no lost form.
 */
import { useEffect, useRef } from "react";
import { resultStrings } from "../model/strings.ts";
import styles from "./ErrorMessage.module.css";

type Props = Readonly<{
  message: string;
  onRetry: () => void;
}>;

export function ErrorMessage({ message, onRetry }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div className={styles.alert} role="alert" tabIndex={-1} ref={ref}>
      <p className={styles.message}>{message}</p>
      <button type="button" className={styles.retry} onClick={onRetry}>
        {resultStrings.retry}
      </button>
    </div>
  );
}
