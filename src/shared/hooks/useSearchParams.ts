/**
 * The URL query string as React state (decision 04). Goals:
 *
 * - The URL is the single source of truth: one subscription through
 *   useSyncExternalStore to popstate (Back, Forward) plus an event we
 *   dispatch after our own pushState, which the browser does not announce.
 * - setSearch pushes a history entry only when the URL actually changes,
 *   so repeating a search does not pile up identical entries.
 * - Parsing stays outside: callers get the raw search string.
 * - One route, so no router.
 */
import { useSyncExternalStore } from "react";

const SEARCH_CHANGE_EVENT = "train-journeys:searchchange";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  window.addEventListener(SEARCH_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(SEARCH_CHANGE_EVENT, onChange);
  };
}

function getSnapshot(): string {
  return window.location.search;
}

/** Pushes a new history entry for the given query string, "?" optional, unless it is already current. */
function setSearch(search: string): void {
  const query = search.replace(/^\?/, "");
  const next = query.length === 0 ? "" : `?${query}`;
  if (next === window.location.search) {
    return;
  }
  window.history.pushState(null, "", `${window.location.pathname}${next}`);
  window.dispatchEvent(new Event(SEARCH_CHANGE_EVENT));
}

export function useSearchParams(): {
  readonly search: string;
  readonly setSearch: (search: string) => void;
} {
  const search = useSyncExternalStore(subscribe, getSnapshot);
  return { search, setSearch };
}
