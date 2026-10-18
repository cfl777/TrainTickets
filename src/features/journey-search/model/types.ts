/* eslint-disable @typescript-eslint/array-type -- the brief's types are kept verbatim, including ReadonlyArray<Journey> */
/**
 * The contract from the assignment, kept exactly as handed over, plus one
 * type of our own. Goals:
 *
 * - SearchJourneys, JourneyParameters, Journeys, Journey and Amount are
 *   verbatim, so the mock is checked against the brief's own signature.
 * - ValidJourneyParameters is a branded JourneyParameters that only the
 *   validator can produce, so the compiler proves the API is never called
 *   with unvalidated input ("parse, don't validate").
 */

/** @public The contract from the brief; consumed by the mock API and the UI. */
export type SearchJourneys = (
  parameters: JourneyParameters,
) => Promise<Journeys>;

/** @public The contract from the brief; consumed by the mock API and the UI. */
export type JourneyParameters = {
  origin: string;
  destination: string;
  date: Date;
  nrOfPassengers: number;
};

/** @public The contract from the brief; consumed by the mock API and the UI. */
export type Journeys = ReadonlyArray<Journey>;

/** @public The contract from the brief; consumed by the mock API and the UI. */
export type Journey = {
  departure: Date;
  arrival: Date;
  price: Amount;
};

/** @public The contract from the brief; consumed by the mock API and the UI. */
export type Amount = {
  value: number;
  currency: string;
};

declare const validated: unique symbol;

/**
 * JourneyParameters that passed validateJourneyParameters. Nothing outside
 * the validator can construct one, because the brand symbol is never
 * exported as a value.
 */
export type ValidJourneyParameters = JourneyParameters & {
  readonly [validated]: true;
};
