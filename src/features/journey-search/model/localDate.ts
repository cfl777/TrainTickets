/**
 * The one place where a calendar day becomes a Date and back. Goals:
 *
 * - A travel date is a local calendar day (assumption 4). Every conversion
 *   here uses local parts: getFullYear, getMonth, getDate and the
 *   three-argument Date constructor.
 * - Never toISOString() or new Date(string): both go through UTC and shift
 *   the day in any non-zero offset.
 * - Strict input: exactly yyyy-mm-dd, and impossible days such as
 *   2026-02-30 are rejected instead of rolled over.
 */

const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Parses yyyy-mm-dd as local midnight of that day, or null when invalid. */
export function parseLocalDate(value: string): Date | null {
  const match = LOCAL_DATE.exec(value);
  if (match === null) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  const roundTrips =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return roundTrips ? date : null;
}

/** Formats the local calendar day of a Date as yyyy-mm-dd. */
export function formatLocalDate(date: Date): string {
  return [
    String(date.getFullYear()),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join("-");
}

/** Local midnight of the day that contains the given instant. */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** True when both instants fall on the same local calendar day. */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
