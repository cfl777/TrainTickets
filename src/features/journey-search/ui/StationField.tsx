/**
 * A station field that loads its combobox on demand (decision 23). Goals:
 *
 * - The initial bundle stays under budget: react-aria-components is
 *   reached only through the dynamic import below, so it ships as its
 *   own chunk, requested as soon as the form renders.
 * - Until that chunk arrives the field is the plain input it used to be,
 *   with the same id, name, label, placeholder and error, so the page is
 *   usable at once and nothing jumps.
 * - What the visitor did meanwhile is handed over: the fallback's text
 *   becomes the combobox's initial value, and if the fallback is the active
 *   element as it leaves the DOM, the combobox input is focused as it
 *   arrives. Whether it had focus is read from the DOM, not from focus
 *   events: a window without focus (a link opened in a background tab)
 *   moves the active element on focus() but fires no event.
 */
import { lazy, Suspense, useRef, useState } from "react";
import { Field } from "../../../shared/ui/Field.tsx";
import { MapPinIcon } from "../../../shared/ui/icons.tsx";
import { MAX_STATION_LENGTH } from "../model/validation.ts";
import type { StationFieldProps } from "./StationComboBox.tsx";

const StationComboBox = lazy(() =>
  import("./StationComboBox.tsx").then((module) => ({
    default: module.StationComboBox,
  })),
);

export function StationField(props: StationFieldProps) {
  const { id, label, placeholder, defaultValue, error, onValueChange } = props;
  const [value, setValue] = useState(defaultValue);
  const fallbackHadFocus = useRef(false);

  const fallback = (
    <Field
      id={id}
      label={label}
      icon={<MapPinIcon />}
      {...(error === undefined ? {} : { error })}
    >
      {(control) => (
        <input
          {...control}
          // The cleanup runs as the fallback is removed, while it is still in the DOM.
          ref={(node) => () => {
            fallbackHadFocus.current = document.activeElement === node;
          }}
          name={id}
          type="text"
          required
          maxLength={MAX_STATION_LENGTH}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            onValueChange?.(event.target.value);
          }}
          placeholder={placeholder}
          autoCapitalize="words"
          spellCheck={false}
          autoComplete="off"
        />
      )}
    </Field>
  );

  return (
    <Suspense fallback={fallback}>
      <StationComboBox
        {...props}
        defaultValue={value}
        inputRef={(node) => {
          if (node !== null && fallbackHadFocus.current) {
            fallbackHadFocus.current = false;
            node.focus();
          }
        }}
      />
    </Suspense>
  );
}
