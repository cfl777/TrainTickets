/**
 * The page: composition only. Goals:
 *
 * - Reads the URL through useSearchParams and the search state through
 *   useJourneySearch; renders the form inside a <search> landmark.
 * - The form is keyed on the search string, so a successful search resets
 *   it to fresh defaults from the URL and a shared link pre-fills it.
 * - Submitting writes the URL; the hook reacts to the URL (decision 04).
 */
import { useSearchParams } from "../../../shared/hooks/useSearchParams.ts";
import { toSearchParams } from "../model/searchParams.ts";
import { useJourneySearch } from "../model/useJourneySearch.ts";
import { SearchForm } from "./SearchForm.tsx";

export function SearchPage() {
  const { search, setSearch } = useSearchParams();
  const state = useJourneySearch(search, { locales: navigator.languages });

  return (
    <main>
      <h1>Train journeys</h1>
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
    </main>
  );
}
