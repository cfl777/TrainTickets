/**
 * The ticket's route glyph: a ring for the origin, a filled dot for the
 * destination. Drawn once, for the stub's route line and for the station
 * the other field holds in the lookup, so the two cannot drift apart.
 */
import { cx } from "../../../shared/lib/cx.ts";
import styles from "./RouteDot.module.css";

type Props = Readonly<{
  /** Filled marks the destination; the default ring marks the origin. */
  filled?: boolean;
  /** Placement only; the glyph's own look stays here. */
  className?: string;
}>;

export function RouteDot({ filled = false, className }: Props) {
  return (
    <span
      className={cx(styles.dot, filled ? styles.filled : undefined, className)}
      aria-hidden="true"
    />
  );
}
