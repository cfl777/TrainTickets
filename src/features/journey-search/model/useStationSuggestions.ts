/**
 * Station suggestions for a typed prefix, through the injected lookup.
 * Goals:
 *
 * - One request per distinct normalised prefix, cached for the session:
 *   the list is static, so typing "En", deleting, typing "En" again never
 *   asks twice, and both fields share one cache.
 * - While the next prefix loads, the previous list stays but only the
 *   stations that match the new prefix: the popup does not flash empty
 *   between keystrokes, and it never offers a station from another
 *   prefix as if it matched, so ArrowDown and Enter before the answer
 *   arrives cannot pick the wrong one. When no previous station matches,
 *   the hook is loading, not empty.
 * - The empty prefix is a request too: it lists every station.
 */
import { useQuery } from "@tanstack/react-query";
import { matchesPrefix, type Station } from "../api/stations.ts";
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
    // A new function per render: Query reuses the last placeholder when the reference is unchanged.
    placeholderData: (previous) => {
      const kept = previous?.filter((station) =>
        matchesPrefix(station, prefix),
      );
      return kept !== undefined && kept.length > 0 ? kept : undefined;
    },
    retry: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return { stations: result.data ?? EMPTY, isLoading: result.isPending };
}
