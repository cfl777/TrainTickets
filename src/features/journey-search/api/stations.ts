/**
 * The station lookup, a separate step from the journey search (decision 14).
 * Goals:
 *
 * - In production rail systems a typed name is resolved to a station by a
 *   lookup and the search is exact; this mock keeps that separation.
 * - Matching is by prefix after trimming, ignoring case and accents, with
 *   the same comparison the search uses for whole names. An empty prefix
 *   lists every station, so the popup can show what the demo serves.
 * - The station list is derived from the timetable, so it cannot drift
 *   from the data that is actually served.
 * - A factory with an injectable delay, like searchJourneys, so tests use
 *   an instant instance and the app a small simulated latency.
 */
import { isSameText } from "../../../shared/lib/text.ts";
import { delay } from "./delay.ts";
import { timetable } from "./timetable.ts";

export type Station = Readonly<{ id: string; name: string }>;

export type SuggestStations = (query: string) => Promise<readonly Station[]>;

const names = [
  ...new Set(timetable.flatMap((entry) => [entry.origin, entry.destination])),
].sort((a, b) => a.localeCompare(b));

export const stations: readonly Station[] = Object.freeze(
  names.map((name) => Object.freeze({ id: name.toLowerCase(), name })),
);

/** True when the station's name starts with the query; every name starts with the empty query. */
export function matchesPrefix(station: Station, query: string): boolean {
  const needle = query.trim();
  return isSameText(station.name.slice(0, needle.length), needle);
}

/** Stations whose name starts with the query; an empty query lists them all. */
export function matchStations(query: string): readonly Station[] {
  return stations.filter((station) => matchesPrefix(station, query));
}

const DEFAULT_DELAY_MS = 150;

export function createSuggestStations({
  delayMs = DEFAULT_DELAY_MS,
}: Readonly<{ delayMs?: number }> = {}): SuggestStations {
  return async (query) => {
    await delay(delayMs);
    return matchStations(query);
  };
}

export const suggestStations: SuggestStations = createSuggestStations();
