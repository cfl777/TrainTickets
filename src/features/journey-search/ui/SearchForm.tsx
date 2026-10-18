/**
 * The search form (decision 05). Goals:
 *
 * - Submitting does not search: the action validates FormData with the
 *   shared validator and either returns errors or calls onSearch with the
 *   branded parameters. The parent writes the URL.
 * - Uncontrolled inputs named like the URL keys; typing never re-renders
 *   the page. noValidate: our summary is the only feedback, native
 *   required/min/max stay for semantics and mobile keyboards.
 * - After a failed submit, each errored field clears its own message once
 *   valid; nothing nags before the first submit. Action-state errors take
 *   precedence over URL errors.
 * - React resets uncontrolled inputs after an action, so the action keeps
 *   the submitted values in state and the inputs read defaultValue from
 *   there first; a failed submit never wipes what was typed.
 * - Defaults: passengers 1, date tomorrow (assumption 7); min date today.
 */
import { useActionState, useState, type ChangeEvent } from "react";
import { Field } from "../../../shared/ui/Field.tsx";
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
import { ErrorSummary } from "./ErrorSummary.tsx";
import styles from "./SearchForm.module.css";

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
      {shownErrors === null ? null : (
        <ErrorSummary errors={shownErrors} attempt={state.attempt} />
      )}
      <div className={styles.fields}>
        <Field
          id="origin"
          label={formStrings.origin.label}
          hint={formStrings.origin.hint}
          {...errorProp(shownErrors, "origin")}
        >
          {(control) => (
            <input
              {...control}
              name="origin"
              type="text"
              required
              maxLength={100}
              defaultValue={value("origin") ?? ""}
              autoCapitalize="words"
              spellCheck={false}
              autoComplete="off"
            />
          )}
        </Field>
        <Field
          id="destination"
          label={formStrings.destination.label}
          hint={formStrings.destination.hint}
          {...errorProp(shownErrors, "destination")}
        >
          {(control) => (
            <input
              {...control}
              name="destination"
              type="text"
              required
              maxLength={100}
              defaultValue={value("destination") ?? ""}
              autoCapitalize="words"
              spellCheck={false}
              autoComplete="off"
            />
          )}
        </Field>
        <Field
          id="date"
          label={formStrings.date.label}
          hint={formStrings.date.hint}
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
          hint={formStrings.passengers.hint}
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
