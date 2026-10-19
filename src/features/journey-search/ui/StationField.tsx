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
 *   and focus become the combobox's initial value and autoFocus.
 */
import { lazy, Suspense, useState } from "react";
import { Field } from "../../../shared/ui/Field.tsx";
import { MapPinIcon } from "../../../shared/ui/icons.tsx";
import type { StationFieldProps } from "./StationComboBox.tsx";

const StationComboBox = lazy(() =>
  import("./StationComboBox.tsx").then((module) => ({
    default: module.StationComboBox,
  })),
);

export function StationField(props: StationFieldProps) {
  const { id, label, placeholder, defaultValue, error } = props;
  const [handover, setHandover] = useState({
    value: defaultValue,
    focused: false,
  });

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
          name={id}
          type="text"
          required
          maxLength={100}
          value={handover.value}
          onChange={(event) => {
            setHandover({ value: event.target.value, focused: true });
          }}
          onFocus={() => {
            setHandover((previous) => ({ ...previous, focused: true }));
          }}
          onBlur={() => {
            setHandover((previous) => ({ ...previous, focused: false }));
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
        defaultValue={handover.value}
        focusOnMount={handover.focused}
      />
    </Suspense>
  );
}
