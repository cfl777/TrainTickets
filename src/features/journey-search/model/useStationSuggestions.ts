/**
 * Station suggestions for a typed prefix, through the injected lookup.
 * Goals:
 *
 * - One request per distinct normalised prefix, cached for the session:
 *   the list is static, so typing "En", deleting, typing "En" again never
 *   asks twice, and both fields share one cache.
 * - The previous list stays while the next prefix loads, so the popup
 *   does not flash empty between keystrokes.
 * - The empty prefix is a request too: it lists every station.
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Station } from "../api/stations.ts";
import { useSuggestStations } from "./useSearchApi.tsx";

/** Re-exported so the ui layer never reaches into api. */
export type { Station };

const EMPTY: readonly Station[] = [];

export function useStationSuggestions(query: string): {
  readonly stations: readonly Station[];
  readonly isLoading: boolean;
} {
  const suggest = useSuggestStations();
  const prefix = query.trim().toLocaleLowerCase();

  const result = useQuery({
    queryKey: ["stations", prefix],
    queryFn: () => suggest(prefix),
    staleTime: Infinity,
    placeholderData: keepPreviousData,
    retry: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return { stations: result.data ?? EMPTY, isLoading: result.isPending };
}
