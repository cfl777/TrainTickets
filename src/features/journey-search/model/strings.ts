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
