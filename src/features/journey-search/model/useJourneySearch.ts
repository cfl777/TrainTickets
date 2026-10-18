/**
 * Parse, validate, query, build rows: one hook, one union (decision 07).
 * Goals:
 *
 * - The only file that imports TanStack Query; components switch on the
 *   returned union and never see the library.
 * - No query until validation passed: skipToken keeps the query off for
 *   idle and invalid URLs, so the API is never called with bad input.
 * - The query key is the validated, normalised parameters with the date
 *   as yyyy-mm-dd, so equal searches share one cache entry and a
 *   response for a superseded key is never shown.
 * - Options from the data-fetching table live here, on the query, so any
 *   QueryClient, including a test's, runs the same behaviour.
 */
import { skipToken, useQuery } from "@tanstack/react-query";
import { formatDate, type Locales } from "../../../shared/lib/format.ts";
import { formatLocalDate } from "../../../shared/lib/localDate.ts";
import { parseSearchParams } from "./searchParams.ts";
import { resultsCaption, searchErrorMessage } from "./strings.ts";
import { toJourneyRows, type JourneyRow } from "./toJourneyRows.ts";
import type { ValidJourneyParameters } from "./types.ts";
import { useSearchApi } from "./useSearchApi.tsx";
import {
  validateJourneyParameters,
  type RawJourneyParameters,
  type ValidationErrors,
} from "./validation.ts";

const FIVE_MINUTES = 5 * 60 * 1000;

export type JourneySearchState =
  | { readonly kind: "idle" }
  | {
      readonly kind: "invalid";
      readonly raw: RawJourneyParameters;
      readonly errors: ValidationErrors;
    }
  | { readonly kind: "loading"; readonly raw: RawJourneyParameters }
  | {
      readonly kind: "success";
      readonly raw: RawJourneyParameters;
      readonly rows: readonly JourneyRow[];
      readonly caption: string;
      readonly count: number;
      readonly passengers: number;
    }
  | {
      readonly kind: "error";
      readonly raw: RawJourneyParameters;
      readonly message: string;
      readonly retry: () => void;
    };

type Options = Readonly<{
  locales: Locales;
  now?: () => Date;
}>;

type ResolvedSearch =
  | { readonly kind: "idle" }
  | {
      readonly kind: "invalid";
      readonly raw: RawJourneyParameters;
      readonly errors: ValidationErrors;
    }
  | {
      readonly kind: "valid";
      readonly raw: RawJourneyParameters;
      readonly params: ValidJourneyParameters;
    };

/** Parse and validate once per render; no query exists until this says valid. */
function resolveSearch(search: string, now: Date): ResolvedSearch {
  const raw = parseSearchParams(search);
  if (raw === null) {
    return { kind: "idle" };
  }
  const result = validateJourneyParameters(raw, now);
  return result.ok
    ? { kind: "valid", raw, params: result.value }
    : { kind: "invalid", raw, errors: result.errors };
}

function queryKeyFor(params: ValidJourneyParameters) {
  return [
    "journeys",
    {
      origin: params.origin,
      destination: params.destination,
      date: formatLocalDate(params.date),
      passengers: params.nrOfPassengers,
    },
  ] as const;
}

export function useJourneySearch(
  search: string,
  { locales, now = () => new Date() }: Options,
): JourneySearchState {
  const api = useSearchApi();

  const resolved = resolveSearch(search, now());
  const params = resolved.kind === "valid" ? resolved.params : null;

  const query = useQuery({
    queryKey: params === null ? ["journeys", null] : queryKeyFor(params),
    queryFn: params === null ? skipToken : () => api(params),
    retry: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: FIVE_MINUTES,
  });

  if (resolved.kind !== "valid") {
    return resolved;
  }
  const { raw } = resolved;

  // A retry keeps the error data while it refetches; show the loading state
  // instead, so the status region says "Searching" again.
  if (query.isError && !query.isFetching) {
    return {
      kind: "error",
      raw,
      message: searchErrorMessage,
      retry: () => {
        void query.refetch();
      },
    };
  }
  if (query.isSuccess) {
    const rows = toJourneyRows(query.data, locales);
    return {
      kind: "success",
      raw,
      rows,
      count: rows.length,
      passengers: resolved.params.nrOfPassengers,
      caption: resultsCaption({
        origin: resolved.params.origin,
        destination: resolved.params.destination,
        date: formatDate(resolved.params.date, locales),
        passengers: resolved.params.nrOfPassengers,
      }),
    };
  }
  return { kind: "loading", raw };
}
