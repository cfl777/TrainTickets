/**
 * The station lookup control (decision 14, built under decision 23).
 * Goals:
 *
 * - React Aria Components do the combobox semantics: roles, the active
 *   option, keyboard handling, announcements, popover placement. This
 *   file only renders and styles them.
 * - The text is the value. allowsCustomValue keeps the form contract as
 *   it was: the input carries the field's name, FormData reads the typed
 *   or chosen text, and validation stays in the model.
 * - The input keeps its known id, so SearchForm can still focus the first
 *   invalid field by id, and the field's own error is passed in, so the
 *   wiring (aria-invalid, aria-describedby) is React Aria's but the
 *   message and timing are the form's.
 * - Styled from the shared Field module so the control looks exactly like
 *   the plain input it replaces (and the fallback shown while this chunk
 *   loads); only the popup and the toggle are new.
 * - Loaded lazily by StationField: this module is the only one that
 *   imports react-aria-components, so Vite splits it out of the initial
 *   bundle.
 */
import { useState, type Ref } from "react";
import {
  Button,
  ComboBox,
  FieldError,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import fieldStyles from "../../../shared/ui/Field.module.css";
import { ChevronDownIcon, MapPinIcon } from "../../../shared/ui/icons.tsx";
import { formStrings } from "../model/strings.ts";
import {
  useStationSuggestions,
  type Station,
} from "../model/useStationSuggestions.ts";
import styles from "./StationComboBox.module.css";

export type StationFieldProps = Readonly<{
  id: "origin" | "destination";
  label: string;
  placeholder: string;
  defaultValue: string;
  error?: string;
}>;

type Props = StationFieldProps &
  Readonly<{
    /** Reaches the input element, so StationField can hand over the fallback's focus. */
    inputRef?: Ref<HTMLInputElement>;
  }>;

/** CSS module keys are string | undefined under noUncheckedIndexedAccess; React Aria wants a string. */
function cx(...names: (string | undefined)[]): string {
  return names.filter((name) => name !== undefined).join(" ");
}

export function StationComboBox({
  id,
  label,
  placeholder,
  defaultValue,
  error,
  inputRef,
}: Props) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const { stations, isLoading } = useStationSuggestions(inputValue);
  const typedLength = inputValue.trim().length;
  const invalid = error !== undefined;

  return (
    <ComboBox
      className={cx(
        fieldStyles.field,
        invalid ? fieldStyles.hasError : undefined,
      )}
      name={id}
      items={stations}
      inputValue={inputValue}
      onInputChange={setInputValue}
      allowsCustomValue
      allowsEmptyCollection
      isRequired
      isInvalid={invalid}
      validationBehavior="aria"
    >
      <Label className={cx(fieldStyles.label)}>{label}</Label>
      <div className={fieldStyles.control}>
        <span className={fieldStyles.icon} aria-hidden="true">
          <MapPinIcon />
        </span>
        <Input
          id={id}
          ref={inputRef}
          className={cx(styles.input)}
          placeholder={placeholder}
          maxLength={100}
          autoCapitalize="words"
          spellCheck={false}
          autoComplete="off"
        />
        <Button
          className={cx(styles.toggle)}
          aria-label={formStrings.stations.toggle}
        >
          <ChevronDownIcon />
        </Button>
      </div>
      <FieldError className={cx(fieldStyles.error)}>{error}</FieldError>
      <Popover className={cx(styles.popover)} offset={4}>
        <ListBox
          className={cx(styles.list)}
          // React Aria caches rendered options per item; the bold prefix must follow the typed text.
          dependencies={[typedLength]}
          renderEmptyState={() => (
            <div className={styles.empty}>
              {isLoading
                ? formStrings.stations.searching
                : formStrings.stations.none}
            </div>
          )}
        >
          {(station: Station) => (
            <ListBoxItem
              id={station.id}
              textValue={station.name}
              className={cx(styles.option)}
            >
              <strong>{station.name.slice(0, typedLength)}</strong>
              {station.name.slice(typedLength)}
            </ListBoxItem>
          )}
        </ListBox>
        {stations.length > 0 ? (
          <p className={styles.count}>
            {formStrings.stations.count(stations.length)}
          </p>
        ) : null}
      </Popover>
    </ComboBox>
  );
}
