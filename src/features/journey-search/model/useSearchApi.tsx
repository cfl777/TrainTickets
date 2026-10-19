/**
 * Injects the feature's API functions (decision 12). Goals:
 *
 * - Production mounts ApiProvider with the real searchJourneys and
 *   suggestStations; tests mount it with instant instances from the
 *   factories. No vi.mock, no coupling to file paths.
 * - The hooks throw when no provider is mounted, so a missing wire is a
 *   clear error at the first render, not an undefined call later.
 */
import { createContext, use, type ReactNode } from "react";
import type { SuggestStations } from "../api/stations.ts";
import type { SearchJourneys } from "./types.ts";

type Api = Readonly<{
  search: SearchJourneys;
  suggest: SuggestStations;
}>;

const ApiContext = createContext<Api | null>(null);

export function ApiProvider({
  api,
  suggest,
  children,
}: {
  readonly api: SearchJourneys;
  readonly suggest: SuggestStations;
  readonly children: ReactNode;
}) {
  return <ApiContext value={{ search: api, suggest }}>{children}</ApiContext>;
}

function useApi(): Api {
  const api = use(ApiContext);
  if (api === null) {
    throw new Error("useSearchApi must be used inside an ApiProvider");
  }
  return api;
}

export function useSearchApi(): SearchJourneys {
  return useApi().search;
}

export function useSuggestStations(): SuggestStations {
  return useApi().suggest;
}
