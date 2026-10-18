/**
 * The polite live region of the results area. Goals:
 *
 * - Always mounted, so assistive tech is already watching it when the
 *   first message arrives (4.1.3).
 * - Polite: loading, counts and "no results" never steal focus; errors
 *   use a separate alert region, because switching role on one element
 *   is unreliable across screen readers.
 * - The spinner is decorative: aria-hidden, stopped under reduced motion.
 */
import styles from "./StatusMessage.module.css";

type Props = Readonly<{
  message: string;
  busy?: boolean;
}>;

export function StatusMessage({ message, busy = false }: Props) {
  return (
    <div className={styles.status} role="status">
      {busy ? <span className={styles.spinner} aria-hidden="true" /> : null}
      {message}
    </div>
  );
}
