/**
 * View model: Journey to a table row of formatted strings. Goals:
 *
 * - All Intl calls and arithmetic for the table happen here, once per
 *   journey; JourneyTable renders strings and nothing else.
 * - Every time value has a machine-readable twin for <time dateTime>:
 *   ISO instants for departure and arrival, an ISO duration for the
 *   duration (toISOString is correct here because these are instants,
 *   not calendar days).
 * - Row ids are built from the journey's own values plus the index, so
 *   two identical services on one day still get distinct keys.
 */
import {
  formatDuration,
  formatPrice,
  formatTime,
  type Locales,
} from "../../../shared/lib/format.ts";
import {
  journeyDuration,
  toHoursAndMinutes,
  toIsoDuration,
} from "./duration.ts";
import type { Journey, Journeys } from "./types.ts";

type TimeCell = Readonly<{ text: string; dateTime: string }>;

export type JourneyRow = Readonly<{
  id: string;
  departure: TimeCell;
  arrival: TimeCell;
  duration: TimeCell;
  price: string;
}>;

function toRow(journey: Journey, index: number, locales: Locales): JourneyRow {
  const departureIso = journey.departure.toISOString();
  const arrivalIso = journey.arrival.toISOString();
  const minutes = journeyDuration(journey);

  return {
    id: `${departureIso}|${arrivalIso}|${String(journey.price.value)}|${String(index)}`,
    departure: {
      text: formatTime(journey.departure, locales),
      dateTime: departureIso,
    },
    arrival: {
      text: formatTime(journey.arrival, locales),
      dateTime: arrivalIso,
    },
    duration: {
      text: formatDuration(toHoursAndMinutes(minutes), locales),
      dateTime: toIsoDuration(minutes),
    },
    price: formatPrice(journey.price, locales),
  };
}

/** Formatted rows for the table, in the order the API returned them. */
export function toJourneyRows(
  journeys: Journeys,
  locales: Locales,
): readonly JourneyRow[] {
  return journeys.map((journey, index) => toRow(journey, index, locales));
}
