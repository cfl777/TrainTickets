/**
 * The results area: switches on the hook's union. Goals:
 *
 * - One status region, always mounted and polite; one alert region, only
 *   on error; the table only with rows. Never two roles on one element.
 * - aria-busy while loading; a reserved minimum height so the layout does
 *   not shift between states.
 * - No rule lives here: every string and number comes from the hook.
 * - The status sits under the rows, as the footer of the list, right
 *   aligned once there is a table; its position in the DOM does not
 *   matter to assistive tech, which listens to the region wherever it is.
 * - While the form no longer matches the search (dirty), the status says
 *   what the results are for, moves above the rows by CSS order so the
 *   region is not re-mounted, and the rows dim (decision 27). One polite
 *   announcement, no alert, no focus move; the caption and the retry stay.
 */
import { resultStrings } from "../model/strings.ts";
import type { JourneySearchState } from "../model/useJourneySearch.ts";
import { ErrorMessage } from "./ErrorMessage.tsx";
import { JourneyTable } from "./JourneyTable.tsx";
import styles from "./SearchResults.module.css";
import { StatusMessage } from "./StatusMessage.tsx";

type Props = Readonly<{
  state: JourneySearchState;
  /** True while the form's fields no longer mean this search. */
  dirty: boolean;
}>;

function statusText(state: JourneySearchState, dirty: boolean): string {
  switch (state.kind) {
    case "loading":
      return resultStrings.searching;
    case "success":
      if (dirty) {
        return state.stale;
      }
      return state.count === 0
        ? resultStrings.none
        : resultStrings.found(state.count);
    case "error":
      return dirty ? state.stale : "";
    case "idle":
    case "invalid":
      return "";
  }
}

export function SearchResults({ state, dirty }: Props) {
  const busy = state.kind === "loading";
  const hasRows = state.kind === "success" && state.count > 0;
  const stale = dirty && (state.kind === "success" || state.kind === "error");
  return (
    <div
      className={
        stale ? [styles.results, styles.stale].join(" ") : styles.results
      }
      aria-busy={busy}
    >
      {state.kind === "error" ? (
        <ErrorMessage message={state.message} onRetry={state.retry} />
      ) : null}
      {hasRows ? (
        <JourneyTable
          caption={state.caption}
          rows={state.rows}
          passengers={state.passengers}
        />
      ) : null}
      <div
        className={stale ? styles.notice : hasRows ? styles.footer : undefined}
      >
        <StatusMessage message={statusText(state, dirty)} busy={busy} />
      </div>
    </div>
  );
}
