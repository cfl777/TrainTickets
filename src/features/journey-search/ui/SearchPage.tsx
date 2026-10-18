/**
 * The page: composition only. Goals:
 *
 * - Reads the URL through useSearchParams and the search state through
 *   useJourneySearch; renders the form inside a <search> landmark and the
 *   results below it.
 * - The form is keyed on the search string, so a successful search resets
 *   it to fresh defaults from the URL and a shared link pre-fills it.
 * - Submitting writes the URL; the hook reacts to the URL (decision 04).
 * - The document title reflects the search (2.4.2); on narrow screens the
 *   results scroll into view after a submit, without motion when the
 *   user prefers none.
 */
import { useEffect, useRef } from "react";
import { useSearchParams } from "../../../shared/hooks/useSearchParams.ts";
import { toSearchParams } from "../model/searchParams.ts";
import { appTitle, searchTitle } from "../model/strings.ts";
import { useJourneySearch } from "../model/useJourneySearch.ts";
import { SearchForm } from "./SearchForm.tsx";
import { SearchResults } from "./SearchResults.tsx";

const NARROW_SCREEN = "(max-width: 639px)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export function SearchPage() {
  const { search, setSearch } = useSearchParams();
  const state = useJourneySearch(search, { locales: navigator.languages });
  const resultsRef = useRef<HTMLDivElement>(null);

  const searching =
    state.kind === "loading" ||
    state.kind === "success" ||
    state.kind === "error";
  const origin = searching ? (state.raw.origin ?? "").trim() : "";
  const destination = searching ? (state.raw.destination ?? "").trim() : "";

  useEffect(() => {
    document.title = searching ? searchTitle(origin, destination) : appTitle;
  }, [searching, origin, destination]);

  useEffect(() => {
    if (!searching || !window.matchMedia(NARROW_SCREEN).matches) {
      return;
    }
    resultsRef.current?.scrollIntoView({
      behavior: window.matchMedia(REDUCED_MOTION).matches ? "auto" : "smooth",
      block: "start",
    });
  }, [search, searching]);

  return (
    <main>
      <h1>{appTitle}</h1>
      <search>
        <SearchForm
          key={search}
          defaultValues={state.kind === "idle" ? null : state.raw}
          initialErrors={state.kind === "invalid" ? state.errors : null}
          onSearch={(params) => {
            setSearch(toSearchParams(params));
          }}
        />
      </search>
      <div ref={resultsRef}>
        <SearchResults state={state} />
      </div>
    </main>
  );
}
