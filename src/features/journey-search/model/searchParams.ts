/**
 * The codec between the URL query string and raw journey parameters.
 * Goals:
 *
 * - Read only the four known keys with get(): unknown keys are ignored,
 *   a repeated key takes its first value, nothing is spread or iterated.
 * - No query string at all means idle, which is a different state from
 *   "present but invalid"; the caller decides what to do with raw values.
 * - Write with URLSearchParams from validated values only, so the URL is
 *   never built by string concatenation.
 * - Dates cross this boundary as yyyy-mm-dd through localDate.
 */
import { formatLocalDate } from "../../../shared/lib/localDate.ts";
import type { ValidJourneyParameters } from "./types.ts";
import type { RawJourneyParameters } from "./validation.ts";

/** Raw values from a query string, or null when there is no query string. */
export function parseSearchParams(search: string): RawJourneyParameters | null {
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (query.length === 0) {
    return null;
  }

  const params = new URLSearchParams(query);
  return {
    origin: params.get("origin"),
    destination: params.get("destination"),
    date: params.get("date"),
    passengers: params.get("passengers"),
  };
}

/** The query string, without the leading "?", for a validated search. */
export function toSearchParams(value: ValidJourneyParameters): string {
  return new URLSearchParams({
    origin: value.origin,
    destination: value.destination,
    date: formatLocalDate(value.date),
    passengers: String(value.nrOfPassengers),
  }).toString();
}
