/**
 * The results area: switches on the hook's union. Goals:
 *
 * - One status region, always mounted and polite; one alert region, only
 *   on error; the table only with rows. Never two roles on one element.
 * - aria-busy while loading; a reserved minimum height so the layout does
 *   not shift between states.
 * - No rule lives here: every string and number comes from the hook.
 */
import { resultStrings } from "../model/strings.ts";
import type { JourneySearchState } from "../model/useJourneySearch.ts";
import { ErrorMessage } from "./ErrorMessage.tsx";
import { JourneyTable } from "./JourneyTable.tsx";
import styles from "./SearchResults.module.css";
import { StatusMessage } from "./StatusMessage.tsx";

type Props = Readonly<{
  state: JourneySearchState;
}>;

function statusText(state: JourneySearchState): string {
  switch (state.kind) {
    case "loading":
      return resultStrings.searching;
    case "success":
      return state.count === 0
        ? resultStrings.none
        : resultStrings.found(state.count);
    case "idle":
    case "invalid":
    case "error":
      return "";
  }
}

export function SearchResults({ state }: Props) {
  const busy = state.kind === "loading";
  return (
    <div className={styles.results} aria-busy={busy}>
      <StatusMessage message={statusText(state)} busy={busy} />
      {state.kind === "error" ? (
        <ErrorMessage message={state.message} onRetry={state.retry} />
      ) : null}
      {state.kind === "success" && state.count > 0 ? (
        <JourneyTable
          caption={state.caption}
          rows={state.rows}
          passengers={state.passengers}
        />
      ) : null}
    </div>
  );
}
