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

/** Labels, hints and copy of the search form. */
export const formStrings = {
  origin: { label: "Origin", hint: "Station name, for example Enschede" },
  destination: {
    label: "Destination",
    hint: "Station name, for example Hengelo",
  },
  date: { label: "Travel date", hint: "Today or later" },
  passengers: { label: "Passengers", hint: "1 to 10" },
  submit: "Search journeys",
  summaryHeading: "There is a problem",
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

export const searchErrorMessage =
  "Something went wrong while searching for journeys.";
