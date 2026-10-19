/**
 * Whether two raw inputs mean the same search. Goals:
 *
 * - The form uses it to tell the page when its fields have moved away from
 *   the searched values, so the results can say what they are for
 *   (decision 27). The rule lives here, not in the component.
 * - Both sides go through the validator, so what counts as "the same" is
 *   exactly what the search folds: trimmed names, case and accents, the
 *   calendar day, the whole number of passengers. A space typed and
 *   deleted, or a name retyped in lower case, is not a change.
 * - An invalid side is never the same search: there are no results for it.
 */
import { isSameText } from "../../../shared/lib/text.ts";
import {
  validateJourneyParameters,
  type RawJourneyParameters,
} from "./validation.ts";

export function isSameSearch(
  a: RawJourneyParameters,
  b: RawJourneyParameters,
  now: Date,
): boolean {
  const left = validateJourneyParameters(a, now);
  const right = validateJourneyParameters(b, now);
  return (
    left.ok &&
    right.ok &&
    isSameText(left.value.origin, right.value.origin) &&
    isSameText(left.value.destination, right.value.destination) &&
    left.value.date.getTime() === right.value.date.getTime() &&
    left.value.nrOfPassengers === right.value.nrOfPassengers
  );
}
