/**
 * The mock search API. Goals:
 *
 * - searchJourneys keeps the brief's signature exactly and is the default
 *   instance of createSearchJourneys({ delayMs, now }); tests build one
 *   with no delay and a fixed clock.
 * - filterJourneys is pure and synchronous: stations match with
 *   isSameText (assumption 3), days with isSameLocalDay (assumption 4),
 *   the price is the total for the party in whole cents divided once
 *   (assumption 2), sorted by departure, returned frozen.
 * - Two typed errors: InvalidParametersError when the API's own check
 *   fails, SearchError for Almelo to Enschede, the one route the timetable
 *   never serves and so the one deterministic failure trigger that passes
 *   validation (decision 25). No random latency, no random failures.
 */
import { isSameLocalDay } from "../../../shared/lib/localDate.ts";
import { isSameText } from "../../../shared/lib/text.ts";
import type {
  Journey,
  JourneyParameters,
  Journeys,
  SearchJourneys,
} from "../model/types.ts";
import { buildJourneys, type ScheduledJourney } from "./fixtures.ts";
import { timetable } from "./timetable.ts";

export class InvalidParametersError extends Error {
  override readonly name = "InvalidParametersError";
}

export class SearchError extends Error {
  override readonly name = "SearchError";
}

const DEFAULT_DELAY_MS = 500;
const ERROR_ROUTE = { origin: "Almelo", destination: "Enschede" } as const;
const MIN_PASSENGERS = 1;
const MAX_PASSENGERS = 10;

function toJourney(
  scheduled: ScheduledJourney,
  nrOfPassengers: number,
): Journey {
  return Object.freeze({
    departure: scheduled.departure,
    arrival: scheduled.arrival,
    price: Object.freeze({
      value: (scheduled.unitPriceCents * nrOfPassengers) / 100,
      currency: scheduled.currency,
    }),
  });
}

/** Pure matching, totalling and sorting over already-built journeys. */
export function filterJourneys(
  journeys: readonly ScheduledJourney[],
  parameters: JourneyParameters,
): Journeys {
  const matches = journeys.filter(
    (journey) =>
      isSameText(journey.origin, parameters.origin) &&
      isSameText(journey.destination, parameters.destination) &&
      isSameLocalDay(journey.departure, parameters.date),
  );

  const sorted = matches.toSorted(
    (a, b) => a.departure.getTime() - b.departure.getTime(),
  );

  return Object.freeze(
    sorted.map((journey) => toJourney(journey, parameters.nrOfPassengers)),
  );
}

function assertParameters(parameters: JourneyParameters): void {
  if (parameters.origin.trim().length === 0) {
    throw new InvalidParametersError("origin is required");
  }
  if (parameters.destination.trim().length === 0) {
    throw new InvalidParametersError("destination is required");
  }
  if (Number.isNaN(parameters.date.getTime())) {
    throw new InvalidParametersError("date is not a valid date");
  }
  if (
    !Number.isInteger(parameters.nrOfPassengers) ||
    parameters.nrOfPassengers < MIN_PASSENGERS ||
    parameters.nrOfPassengers > MAX_PASSENGERS
  ) {
    throw new InvalidParametersError("nrOfPassengers must be 1 to 10");
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export type SearchJourneysOptions = Readonly<{
  /** Simulated latency; 0 in tests. */
  delayMs?: number;
  /** Clock used to build the daily timetable at call time. */
  now?: () => Date;
}>;

/** Builds a search function; the default instance below is what the app uses. */
export function createSearchJourneys({
  delayMs = DEFAULT_DELAY_MS,
  now = () => new Date(),
}: SearchJourneysOptions = {}): SearchJourneys {
  return async (parameters) => {
    assertParameters(parameters);
    await delay(delayMs);

    if (
      isSameText(parameters.origin, ERROR_ROUTE.origin) &&
      isSameText(parameters.destination, ERROR_ROUTE.destination)
    ) {
      throw new SearchError("The journey search failed");
    }

    return filterJourneys(buildJourneys(timetable, now()), parameters);
  };
}

export const searchJourneys: SearchJourneys = createSearchJourneys();
