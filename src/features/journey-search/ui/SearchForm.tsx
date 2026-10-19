/**
 * The search form (decision 05, amended by decision 22). Goals:
 *
 * - Submitting does not search: the action validates FormData with the
 *   shared validator and either returns errors or calls onSearch with the
 *   branded parameters. The parent writes the URL.
 * - Uncontrolled inputs named like the URL keys; typing never re-renders
 *   the page. noValidate: our messages are the only feedback, native
 *   required/min/max stay for semantics and mobile keyboards.
 * - Errors are shown under their fields. After a failed submit, focus moves
 *   to the first invalid field and a visually hidden alert says how many
 *   fields need attention, so screen-reader users learn what sighted users
 *   see. Each errored field clears its own message once valid; nothing nags
 *   before the first submit. Action-state errors take precedence over URL
 *   errors.
 * - React resets uncontrolled inputs after an action, so the action keeps
 *   the submitted values in state and the inputs read defaultValue from
 *   there first; a failed submit never wipes what was typed.
 * - Defaults: passengers 1, date tomorrow (assumption 7); min date today.
 * - Origin and destination are StationFields: a lookup over the same
 *   input contract (name, id, text value), so this file reads FormData
 *   exactly as before. The lookup keeps its text in React state, which the
 *   post-action reset would clear, so the two fields are keyed on the
 *   attempt and re-mount with the submitted values instead.
 */
import { useActionState, useEffect, useState, type ChangeEvent } from "react";
import { Field } from "../../../shared/ui/Field.tsx";
import { CalendarIcon, UsersIcon } from "../../../shared/ui/icons.tsx";
import {
  formatLocalDate,
  startOfLocalDay,
} from "../../../shared/lib/localDate.ts";
import { formStrings } from "../model/strings.ts";
import type { ValidJourneyParameters } from "../model/types.ts";
import {
  validateJourneyParameters,
  type JourneyField,
  type RawJourneyParameters,
  type ValidationErrors,
} from "../model/validation.ts";
import styles from "./SearchForm.module.css";
import { StationField } from "./StationField.tsx";

const FIELDS = [
  "origin",
  "destination",
  "date",
  "passengers",
] as const satisfies readonly JourneyField[];

type Props = Readonly<{
  /** Raw values from the URL, pre-filling the form; null when there is no query string. */
  defaultValues: RawJourneyParameters | null;
  /** Errors from an invalid URL, shown until the first submit. */
  initialErrors: ValidationErrors | null;
  onSearch: (params: ValidJourneyParameters) => void;
  now?: () => Date;
}>;

type FormState = Readonly<{
  errors: ValidationErrors | null;
  values: RawJourneyParameters | null;
  attempt: number;
}>;

function readRaw(formData: FormData): RawJourneyParameters {
  const read = (name: JourneyField): string | null => {
    const value = formData.get(name);
    return typeof value === "string" ? value : null;
  };
  return {
    origin: read("origin"),
    destination: read("destination"),
    date: read("date"),
    passengers: read("passengers"),
  };
}

function invalidFields(errors: ValidationErrors | null): JourneyField[] {
  return errors === null
    ? []
    : FIELDS.filter((field) => errors[field] !== undefined);
}

/** Keeps only the errors for fields that were already shown, so messages clear but never appear mid-typing. */
function keepShown(
  errors: ValidationErrors,
  shown: ValidationErrors,
): ValidationErrors {
  const kept: Partial<Record<JourneyField, string>> = {};
  for (const field of FIELDS) {
    const message = errors[field];
    if (message !== undefined && shown[field] !== undefined) {
      kept[field] = message;
    }
  }
  return kept;
}

function errorProp(
  errors: ValidationErrors | null,
  field: JourneyField,
): { error?: string } {
  const message = errors?.[field];
  return message === undefined ? {} : { error: message };
}

export function SearchForm({
  defaultValues,
  initialErrors,
  onSearch,
  now = () => new Date(),
}: Props) {
  const today = startOfLocalDay(now());
  const todayValue = formatLocalDate(today);
  const tomorrowValue = formatLocalDate(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
  );

  const [state, formAction] = useActionState(
    (previous: FormState, formData: FormData): FormState => {
      const raw = readRaw(formData);
      const result = validateJourneyParameters(raw, now());
      if (result.ok) {
        onSearch(result.value);
        return { errors: null, values: raw, attempt: previous.attempt };
      }
      return {
        errors: result.errors,
        values: raw,
        attempt: previous.attempt + 1,
      };
    },
    { errors: initialErrors, values: null, attempt: 0 },
  );

  const [live, setLive] = useState<{
    attempt: number;
    errors: ValidationErrors;
  } | null>(null);
  const shownErrors =
    state.errors === null
      ? null
      : live !== null && live.attempt === state.attempt
        ? live.errors
        : state.errors;

  // After each failed submit (and on load with URL errors), focus the first
  // invalid field; the attempt counter makes a repeat failure refocus too.
  const failedFields = invalidFields(state.errors);
  const firstInvalid = failedFields[0] ?? null;
  useEffect(() => {
    if (firstInvalid !== null) {
      document.getElementById(firstInvalid)?.focus();
    }
  }, [firstInvalid, state.attempt]);

  function handleChange(event: ChangeEvent<HTMLFormElement>) {
    if (shownErrors === null) {
      return;
    }
    const result = validateJourneyParameters(
      readRaw(new FormData(event.currentTarget)),
      now(),
    );
    setLive({
      attempt: state.attempt,
      errors: result.ok ? {} : keepShown(result.errors, shownErrors),
    });
  }

  const value = (field: JourneyField): string | null =>
    state.values?.[field] ?? defaultValues?.[field] ?? null;

  return (
    <form
      action={formAction}
      noValidate
      onChange={handleChange}
      className={styles.form}
    >
      {failedFields.length > 0 ? (
        <p role="alert" className={styles.visuallyHidden}>
          {formStrings.errorsAnnouncement(failedFields.length)}
        </p>
      ) : null}
      <div className={styles.fields}>
        <StationField
          key={`origin-${String(state.attempt)}`}
          id="origin"
          label={formStrings.origin.label}
          placeholder={formStrings.origin.placeholder}
          defaultValue={value("origin") ?? ""}
          {...errorProp(shownErrors, "origin")}
        />
        <StationField
          key={`destination-${String(state.attempt)}`}
          id="destination"
          label={formStrings.destination.label}
          placeholder={formStrings.destination.placeholder}
          defaultValue={value("destination") ?? ""}
          {...errorProp(shownErrors, "destination")}
        />
        <Field
          id="date"
          label={formStrings.date.label}
          icon={<CalendarIcon />}
          {...errorProp(shownErrors, "date")}
        >
          {(control) => (
            <input
              {...control}
              name="date"
              type="date"
              required
              min={todayValue}
              defaultValue={value("date") ?? tomorrowValue}
            />
          )}
        </Field>
        <Field
          id="passengers"
          label={formStrings.passengers.label}
          icon={<UsersIcon />}
          {...errorProp(shownErrors, "passengers")}
        >
          {(control) => (
            <input
              {...control}
              name="passengers"
              type="number"
              required
              min={1}
              max={10}
              step={1}
              inputMode="numeric"
              enterKeyHint="search"
              defaultValue={value("passengers") ?? "1"}
            />
          )}
        </Field>
        <button type="submit" className={styles.submit}>
          {formStrings.submit}
        </button>
      </div>
    </form>
  );
}
