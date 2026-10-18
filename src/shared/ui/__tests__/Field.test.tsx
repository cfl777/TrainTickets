import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { Field } from "../Field.tsx";

describe("Field", () => {
  it("associates the label with the control", () => {
    render(
      <Field label="Origin">
        {(control) => <input type="text" {...control} />}
      </Field>,
    );
    expect(screen.getByLabelText("Origin")).toBeInTheDocument();
  });

  it("describes the control by its hint", () => {
    render(
      <Field label="Date" hint="For example 2026-10-21">
        {(control) => <input type="text" {...control} />}
      </Field>,
    );
    const input = screen.getByLabelText("Date");
    expect(input).toHaveAccessibleDescription("For example 2026-10-21");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("marks the control invalid and describes it by hint and error", () => {
    render(
      <Field label="Origin" hint="A station name" error="Enter an origin">
        {(control) => <input type="text" {...control} />}
      </Field>,
    );
    const input = screen.getByLabelText("Origin");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("A station name Enter an origin");
    expect(screen.getByText("Enter an origin")).toBeInTheDocument();
  });

  it("uses a given id so a summary can link to the field", () => {
    render(
      <Field label="Origin" id="origin">
        {(control) => <input type="text" {...control} />}
      </Field>,
    );
    expect(screen.getByLabelText("Origin")).toHaveAttribute("id", "origin");
  });

  it("keeps a decorative icon out of the accessibility tree", async () => {
    const { container } = render(
      <Field label="Origin" icon={<svg data-testid="pin" />}>
        {(control) => <input type="text" {...control} />}
      </Field>,
    );
    expect(screen.getByLabelText("Origin")).toHaveAccessibleName("Origin");
    expect(
      container.querySelector('[aria-hidden="true"] svg'),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no accessibility violations with and without an error", async () => {
    const { container, rerender } = render(
      <Field label="Origin">
        {(control) => <input type="text" {...control} />}
      </Field>,
    );
    expect(await axe(container)).toHaveNoViolations();
    rerender(
      <Field label="Origin" error="Enter an origin">
        {(control) => <input type="text" {...control} />}
      </Field>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
