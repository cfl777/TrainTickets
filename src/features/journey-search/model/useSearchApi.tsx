/**
 * Injects the search API (decision 12). Goals:
 *
 * - Production mounts ApiProvider with the real searchJourneys; tests
 *   mount it with createSearchJourneys({ delayMs: 0, now }). No vi.mock,
 *   no coupling to file paths.
 * - useSearchApi throws when no provider is mounted, so a missing wire is
 *   a clear error at the first render, not an undefined call later.
 */
import { createContext, use, type ReactNode } from "react";
import type { SearchJourneys } from "./types.ts";

const SearchApiContext = createContext<SearchJourneys | null>(null);

export function ApiProvider({
  api,
  children,
}: {
  readonly api: SearchJourneys;
  readonly children: ReactNode;
}) {
  return <SearchApiContext value={api}>{children}</SearchApiContext>;
}

export function useSearchApi(): SearchJourneys {
  const api = use(SearchApiContext);
  if (api === null) {
    throw new Error("useSearchApi must be used inside an ApiProvider");
  }
  return api;
}
