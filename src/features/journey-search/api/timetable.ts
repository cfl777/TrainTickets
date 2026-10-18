/**
 * The brief's eight example journeys, read as a daily timetable
 * (assumption 1). Goals:
 *
 * - One row per service in the brief's order; sourceDate keeps the trace
 *   back to the PDF, times stay as written, prices are whole cents so
 *   3 × €5.00 is exactly €15.00 (assumption 2).
 * - Pure data, as const: fixtures build Journey objects from it at call
 *   time, so nothing here depends on today's date.
 */

export const TIMETABLE_CURRENCY = "EUR";

export const timetable = [
  {
    origin: "Enschede",
    destination: "Hengelo",
    sourceDate: "2025-04-20",
    departure: "09:00",
    arrival: "09:10",
    unitPriceCents: 600,
  },
  {
    origin: "Enschede",
    destination: "Hengelo",
    sourceDate: "2025-04-20",
    departure: "14:00",
    arrival: "14:15",
    unitPriceCents: 500,
  },
  {
    origin: "Enschede",
    destination: "Almelo",
    sourceDate: "2025-04-20",
    departure: "09:00",
    arrival: "09:30",
    unitPriceCents: 750,
  },
  {
    origin: "Enschede",
    destination: "Almelo",
    sourceDate: "2025-04-21",
    departure: "12:15",
    arrival: "12:45",
    unitPriceCents: 600,
  },
  {
    origin: "Hengelo",
    destination: "Enschede",
    sourceDate: "2025-04-20",
    departure: "17:00",
    arrival: "19:30",
    unitPriceCents: 500,
  },
  {
    origin: "Hengelo",
    destination: "Enschede",
    sourceDate: "2025-04-21",
    departure: "17:00",
    arrival: "19:30",
    unitPriceCents: 500,
  },
  {
    origin: "Hengelo",
    destination: "Almelo",
    sourceDate: "2025-04-21",
    departure: "14:30",
    arrival: "14:45",
    unitPriceCents: 350,
  },
  {
    origin: "Almelo",
    destination: "Hengelo",
    sourceDate: "2025-04-21",
    departure: "16:30",
    arrival: "17:00",
    unitPriceCents: 350,
  },
] as const;

export type TimetableEntry = (typeof timetable)[number];
