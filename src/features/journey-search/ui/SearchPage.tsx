/**
 * The page: composition only. Goals:
 *
 * - Reads the URL through useSearchParams and the search state through
 *   useJourneySearch; renders the form inside a <search> landmark and the
 *   results below it. The landmark holds the ticket card: the h1 in its
 *   stub with a decorative route line, a perforation, then the form.
 * - The form is keyed on the search string, so a successful search resets
 *   it to fresh defaults from the URL and a shared link pre-fills it.
 * - Submitting writes the URL; the hook reacts to the URL (decision 04).
 * - The form says when its fields no longer mean the searched values; the
 *   page keeps that as the search string it belongs to, so a new search
 *   clears it without an effect, and hands the boolean to the results
 *   (decision 27).
 * - The document title reflects the search (2.4.2).
 * - When the search changes after a submit, focus moves to the results
 *   region, so it is never lost when the form remounts and a screen-reader
 *   user lands where the answer is (2.4.3). On narrow screens the results
 *   also scroll into view, without motion when the user prefers none. A
 *   page opened with a query string keeps its natural focus.
 */
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "../../../shared/hooks/useSearchParams.ts";
import { toSearchParams } from "../model/searchParams.ts";
import {
  appTitle,
  formStrings,
  resultStrings,
  searchTitle,
} from "../model/strings.ts";
import { useJourneySearch } from "../model/useJourneySearch.ts";
import { SearchForm } from "./SearchForm.tsx";
import styles from "./SearchPage.module.css";
import { SearchResults } from "./SearchResults.tsx";

const NARROW_SCREEN = "(max-width: 639px)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export function SearchPage() {
  const { search, setSearch } = useSearchParams();
  const state = useJourneySearch(search, { locales: navigator.languages });
  const resultsRef = useRef<HTMLElement>(null);
  const previousSearch = useRef(search);
  const [dirtyFor, setDirtyFor] = useState<string | null>(null);

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
    if (previousSearch.current === search) {
      return;
    }
    previousSearch.current = search;
    const results = resultsRef.current;
    if (!searching || results === null) {
      return;
    }
    results.focus({ preventScroll: true });
    if (window.matchMedia(NARROW_SCREEN).matches) {
      results.scrollIntoView({
        behavior: window.matchMedia(REDUCED_MOTION).matches ? "auto" : "smooth",
        block: "start",
      });
    }
  }, [search, searching]);

  return (
    <main>
      <search>
        <div className={styles.ticket}>
          <div className={styles.stub}>
            <h1>{appTitle}</h1>
            <p className={styles.route} aria-hidden="true">
              <span className={styles.stop}>
                <span className={styles.dot} />{" "}
                <span>{formStrings.ticket.from}</span>
              </span>
              <span className={styles.line} />
              <span className={styles.stop}>
                <span className={[styles.dot, styles.dotTo].join(" ")} />{" "}
                <span>{formStrings.ticket.to}</span>
              </span>
            </p>
          </div>
          <div className={styles.perforation} aria-hidden="true" />
          <SearchForm
            key={search}
            defaultValues={state.kind === "idle" ? null : state.raw}
            initialErrors={state.kind === "invalid" ? state.errors : null}
            onSearch={(params) => {
              setSearch(toSearchParams(params));
            }}
            onDirtyChange={(dirty) => {
              setDirtyFor(dirty ? search : null);
            }}
          />
        </div>
        <p className={styles.note}>{formStrings.stationsNote}</p>
      </search>
      <section
        ref={resultsRef}
        aria-label={resultStrings.resultsRegion}
        tabIndex={-1}
        className={styles.results}
      >
        <SearchResults state={state} dirty={dirtyFor === search} />
      </section>
    </main>
  );
}
