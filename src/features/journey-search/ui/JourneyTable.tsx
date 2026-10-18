/**
 * The results table. Goals:
 *
 * - No Intl call and no arithmetic: rows arrive formatted from the view
 *   model, with dateTime twins for <time>.
 * - Real table semantics at every width: <caption>, <th scope="col">;
 *   rows are never turned into cards (1.3.1).
 * - The scroll wrapper is a focusable, labelled region, so a keyboard
 *   user can reach and scroll it if a locale ever makes it overflow.
 */
import { resultStrings } from "../model/strings.ts";
import type { JourneyRow } from "../model/toJourneyRows.ts";
import styles from "./JourneyTable.module.css";

type Props = Readonly<{
  caption: string;
  rows: readonly JourneyRow[];
  passengers: number;
}>;

export function JourneyTable({ caption, rows, passengers }: Props) {
  const { columns } = resultStrings;
  return (
    <div
      className={styles.scroll}
      role="region"
      aria-label={resultStrings.tableRegion}
      tabIndex={0}
    >
      <table className={styles.table}>
        <caption className={styles.caption}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{columns.departure}</th>
            <th scope="col">{columns.arrival}</th>
            <th scope="col">{columns.duration}</th>
            <th scope="col">{columns.price(passengers)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className={styles.time}>
                <time dateTime={row.departure.dateTime}>
                  {row.departure.text}
                </time>
              </td>
              <td className={styles.time}>
                <time dateTime={row.arrival.dateTime}>{row.arrival.text}</time>
              </td>
              <td className={styles.duration}>
                <time dateTime={row.duration.dateTime}>
                  {row.duration.text}
                </time>
              </td>
              <td>
                <span className={styles.pill}>{row.price}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
