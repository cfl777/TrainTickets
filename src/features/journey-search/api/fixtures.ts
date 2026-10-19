/**
 * Builds the journeys the mock serves from the timetable. Goals:
 *
 * - Every service runs every day from tomorrow (+1) to the Friday of next
 *   week (+8), computed from `now` at call time (assumption 1), so a tab
 *   left open past midnight still shifts correctly.
 * - Departure and arrival are local instants built from local parts with
 *   the Date constructor; a 09:00 service is 09:00 in the browser's zone
 *   on every day, including clock-change days (assumption 8).
 * - ScheduledJourney keeps origin, destination and the per-passenger
 *   price, which the brief's Journey does not carry; the search maps to
 *   Journey after matching and totalling.
 */
import { startOfLocalDay } from "../../../shared/lib/localDate.ts";
import {
  TIMETABLE_CURRENCY,
  timetable,
  type TimetableEntry,
} from "./timetable.ts";

export type ScheduledJourney = Readonly<{
  origin: string;
  destination: string;
  departure: Date;
  arrival: Date;
  unitPriceCents: number;
  currency: string;
}>;

const FIRST_DAY_OFFSET = 1;
const LAST_DAY_OFFSET = 8;

function parseTime(time: string): { hours: number; minutes: number } {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return { hours, minutes };
}

function atLocalTime(day: Date, offsetDays: number, time: string): Date {
  const { hours, minutes } = parseTime(time);
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate() + offsetDays,
    hours,
    minutes,
  );
}

/** Journeys for every service on days +1 to +8 from `now`, in day then timetable order. */
export function buildJourneys(
  entries: readonly TimetableEntry[] = timetable,
  now: Date = new Date(),
): readonly ScheduledJourney[] {
  const today = startOfLocalDay(now);
  const journeys: ScheduledJourney[] = [];

  for (let offset = FIRST_DAY_OFFSET; offset <= LAST_DAY_OFFSET; offset += 1) {
    for (const entry of entries) {
      journeys.push({
        origin: entry.origin,
        destination: entry.destination,
        departure: atLocalTime(today, offset, entry.departure),
        arrival: atLocalTime(today, offset, entry.arrival),
        unitPriceCents: entry.unitPriceCents,
        currency: TIMETABLE_CURRENCY,
      });
    }
  }

  return journeys;
}
