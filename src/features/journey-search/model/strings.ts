/**
 * All user-facing copy for the journey search feature, in English.
 * Keeping it in one module means translation is a drop-in and no rule or
 * component owns wording.
 */

export const validationMessages = {
  origin: "Enter an origin",
  destination: "Enter a destination",
  sameStation: "Destination must differ from origin",
  date: "Choose a date from today onwards",
  passengers: "Choose between 1 and 10 passengers",
} as const;

/** Labels, placeholders and copy of the search form. */
export const formStrings = {
  origin: { label: "Origin", placeholder: "Enschede" },
  destination: { label: "Destination", placeholder: "Hengelo" },
  date: { label: "Travel date" },
  passengers: { label: "Passengers" },
  submit: "Search journeys",
  stationsNote: "The demo timetable serves Enschede, Hengelo and Almelo.",
  /** Copy of the station lookup popup. */
  stations: {
    searching: "Searching stations",
    none: "No stations match",
    count: (n: number): string =>
      n === 1 ? "1 station" : `${String(n)} stations`,
    toggle: "Show stations",
  },
  /** Read by screen readers after a failed submit; the messages themselves sit under the fields. */
  errorsAnnouncement: (count: number): string =>
    count === 1
      ? "1 field needs attention"
      : `${String(count)} fields need attention`,
} as const;

/** Caption of the results table: the search in words, with the date already formatted. */
export function resultsCaption(parts: {
  readonly origin: string;
  readonly destination: string;
  readonly date: string;
  readonly passengers: number;
}): string {
  const noun = parts.passengers === 1 ? "passenger" : "passengers";
  return `${parts.origin} to ${parts.destination} on ${parts.date}, ${String(parts.passengers)} ${noun}`;
}

/** Copy of the results area: status messages, table headings, retry. */
export const resultStrings = {
  searching: "Searching for journeys",
  found: (count: number): string =>
    count === 1 ? "1 journey found" : `${String(count)} journeys found`,
  none: "No journeys found for this search",
  retry: "Try again",
  resultsRegion: "Search results",
  tableRegion: "Journey results",
  columns: {
    departure: "Departure",
    arrival: "Arrival",
    duration: "Duration",
    price: (passengers: number): string =>
      passengers === 1
        ? "Total for 1 passenger"
        : `Total for ${String(passengers)} passengers`,
  },
} as const;

/** Document titles: the search in the tab, the app name alone when idle. */
export const appTitle = "Train journeys";
export function searchTitle(origin: string, destination: string): string {
  return `${origin} to ${destination} | ${appTitle}`;
}

export const searchErrorMessage =
  "Something went wrong while searching for journeys.";
