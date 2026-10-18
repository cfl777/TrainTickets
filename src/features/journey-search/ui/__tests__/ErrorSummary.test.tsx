import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { ErrorSummary } from "../ErrorSummary.tsx";

describe("ErrorSummary", () => {
  it("renders nothing without errors", () => {
    const { container } = render(<ErrorSummary errors={{}} attempt={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists the errors in field order as links, whatever the key order", () => {
    render(
      <ErrorSummary
        errors={{
          passengers: "Choose between 1 and 10 passengers",
          origin: "Enter an origin",
        }}
        attempt={1}
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "There is a problem" }),
    ).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Enter an origin",
      "Choose between 1 and 10 passengers",
    ]);
    expect(links[0]).toHaveAttribute("href", "#origin");
  });

  it("takes focus when it appears and again on the next attempt", () => {
    const { rerender } = render(
      <ErrorSummary errors={{ origin: "Enter an origin" }} attempt={1} />,
    );
    const summary = screen.getByRole("alert");
    expect(summary).toHaveFocus();

    summary.blur();
    expect(summary).not.toHaveFocus();

    rerender(
      <ErrorSummary errors={{ origin: "Enter an origin" }} attempt={2} />,
    );
    expect(summary).toHaveFocus();
  });

  it("does not steal focus when only the errors change", () => {
    const { rerender } = render(
      <ErrorSummary
        errors={{
          origin: "Enter an origin",
          destination: "Enter a destination",
        }}
        attempt={1}
      />,
    );
    screen.getByRole("alert").blur();
    rerender(
      <ErrorSummary
        errors={{ destination: "Enter a destination" }}
        attempt={1}
      />,
    );
    expect(screen.getByRole("alert")).not.toHaveFocus();
  });

  it("focuses the field when its link is clicked", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ErrorSummary errors={{ origin: "Enter an origin" }} attempt={1} />
        <label htmlFor="origin">Origin</label>
        <input id="origin" />
      </>,
    );
    await user.click(screen.getByRole("link", { name: "Enter an origin" }));
    expect(screen.getByLabelText("Origin")).toHaveFocus();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ErrorSummary
        errors={{
          origin: "Enter an origin",
          date: "Choose a date from today onwards",
        }}
        attempt={1}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
