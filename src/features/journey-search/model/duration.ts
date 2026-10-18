/**
 * Journey duration, derived rather than stored (decision 01). Goals:
 *
 * - Elapsed time between the two instants, in whole minutes; the data has
 *   no seconds and a clock change does not alter elapsed time.
 * - An ISO 8601 duration for <time dateTime>, so the formatted text the
 *   user sees has a machine-readable twin.
 */
import type { Journey } from "./types.ts";

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;

/** Minutes from departure to arrival. */
export function journeyDuration(journey: Journey): number {
  return Math.round(
    (journey.arrival.getTime() - journey.departure.getTime()) / MS_PER_MINUTE,
  );
}

/** Hours and minutes parts of a duration in minutes, for formatters. */
export function toHoursAndMinutes(minutes: number): {
  hours: number;
  minutes: number;
} {
  return {
    hours: Math.floor(minutes / MINUTES_PER_HOUR),
    minutes: minutes % MINUTES_PER_HOUR,
  };
}

/** ISO 8601 duration such as PT2H30M, PT10M or PT2H. */
export function toIsoDuration(totalMinutes: number): string {
  const { hours, minutes } = toHoursAndMinutes(totalMinutes);
  if (hours === 0) {
    return `PT${String(minutes)}M`;
  }
  if (minutes === 0) {
    return `PT${String(hours)}H`;
  }
  return `PT${String(hours)}H${String(minutes)}M`;
}
