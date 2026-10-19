/**
 * The single validator for journey search input, used by the form action
 * and the URL parser. Goals:
 *
 * - One set of rules, so the form and a hand-edited URL are judged alike.
 * - All fields are checked at once, so one submit shows every message
 *   under its field (decision 22).
 * - "Parse, don't validate": on success the result is the branded
 *   ValidJourneyParameters, with trimmed names, a local-midnight Date and
 *   an integer passenger count. This is the only file that constructs it.
 * - Rules and messages from docs/architecture.md, "Form and validation".
 *
 * Why not Zod, for example:
 * The strongest argument for a schema library is one schema
 * for two input sources, which is exactly this file's job. But two of the
 * five rules (the local calendar-day comparison and the collator-based
 * "destination differs from origin") need custom code either way, and this
 * is the only schema in the application, so a dependency would be carried
 * for three string checks. See docs/decisions.md, entry 05.
 */
import { isSameText } from "../../../shared/lib/text.ts";
import {
  parseLocalDate,
  startOfLocalDay,
} from "../../../shared/lib/localDate.ts";
import { validationMessages } from "./strings.ts";
import type { ValidJourneyParameters } from "./types.ts";

export type JourneyField = "origin" | "destination" | "date" | "passengers";

export type RawJourneyParameters = Readonly<
  Record<JourneyField, string | null>
>;

export type ValidationErrors = Readonly<Partial<Record<JourneyField, string>>>;

type ValidationResult =
  | { readonly ok: true; readonly value: ValidJourneyParameters }
  | { readonly ok: false; readonly errors: ValidationErrors };

const MAX_STATION_LENGTH = 100;
const MIN_PASSENGERS = 1;
const MAX_PASSENGERS = 10;
const WHOLE_NUMBER = /^\d+$/;

function parseStation(value: string | null): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 && trimmed.length <= MAX_STATION_LENGTH
    ? trimmed
    : null;
}

function parseTravelDate(value: string | null, now: Date): Date | null {
  const date = parseLocalDate(value ?? "");
  if (date === null) {
    return null;
  }
  return date.getTime() >= startOfLocalDay(now).getTime() ? date : null;
}

function parsePassengers(value: string | null): number | null {
  const trimmed = (value ?? "").trim();
  if (!WHOLE_NUMBER.test(trimmed)) {
    return null;
  }
  const count = Number(trimmed);
  return count >= MIN_PASSENGERS && count <= MAX_PASSENGERS ? count : null;
}

export function validateJourneyParameters(
  raw: RawJourneyParameters,
  now: Date,
): ValidationResult {
  const origin = parseStation(raw.origin);
  const destination = parseStation(raw.destination);
  const date = parseTravelDate(raw.date, now);
  const nrOfPassengers = parsePassengers(raw.passengers);

  const errors: Partial<Record<JourneyField, string>> = {};

  if (origin === null) {
    errors.origin = validationMessages.origin;
  }
  if (destination === null) {
    errors.destination = validationMessages.destination;
  } else if (origin !== null && isSameText(origin, destination)) {
    errors.destination = validationMessages.sameStation;
  }
  if (date === null) {
    errors.date = validationMessages.date;
  }
  if (nrOfPassengers === null) {
    errors.passengers = validationMessages.passengers;
  }

  if (
    Object.keys(errors).length > 0 ||
    origin === null ||
    destination === null ||
    date === null ||
    nrOfPassengers === null
  ) {
    return { ok: false, errors };
  }

  // The only construction of ValidJourneyParameters in the codebase.
  return {
    ok: true,
    value: {
      origin,
      destination,
      date,
      nrOfPassengers,
    } as ValidJourneyParameters,
  };
}
