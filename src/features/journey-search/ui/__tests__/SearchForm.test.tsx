import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { SearchForm } from "../SearchForm.tsx";

const now = () => new Date(2026, 9, 20, 15, 30);

function renderForm(props: Partial<Parameters<typeof SearchForm>[0]> = {}) {
  const onSearch = vi.fn();
  const utils = render(
    <SearchForm
      defaultValues={null}
      initialErrors={null}
      onSearch={onSearch}
      now={now}
      {...props}
    />,
  );
  return { ...utils, onSearch, user: userEvent.setup() };
}

describe("SearchForm", () => {
  it("defaults to tomorrow and one passenger, with today as the earliest date", () => {
    renderForm();
    expect(screen.getByLabelText("Travel date")).toHaveValue("2026-10-21");
    expect(screen.getByLabelText("Travel date")).toHaveAttribute(
      "min",
      "2026-10-20",
    );
    expect(screen.getByLabelText("Passengers")).toHaveValue(1);
    expect(
      screen.getByRole("button", { name: "Search journeys" }),
    ).toBeEnabled();
  });

  it("turns native validation bubbles off", () => {
    const { container } = renderForm();
    expect(container.querySelector("form")).toHaveAttribute("novalidate");
  });

  it("marks the fields, announces the count and focuses the first invalid field on an invalid submit", async () => {
    const { user, onSearch } = renderForm();
    await user.click(screen.getByRole("button", { name: "Search journeys" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "2 fields need attention",
    );
    expect(screen.getByLabelText("Origin")).toHaveFocus();
    expect(screen.getByLabelText("Origin")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Origin")).toHaveAccessibleDescription(
      "Enter an origin",
    );
    expect(screen.getByText("Enter a destination")).toBeInTheDocument();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("refocuses the first invalid field on a repeated failed submit", async () => {
    const { user } = renderForm();
    const button = screen.getByRole("button", { name: "Search journeys" });
    await user.click(button);
    await user.click(screen.getByLabelText("Passengers"));
    expect(screen.getByLabelText("Origin")).not.toHaveFocus();
    await user.click(button);
    expect(screen.getByLabelText("Origin")).toHaveFocus();
  });

  it("calls onSearch with the validated parameters and announces nothing", async () => {
    const { user, onSearch } = renderForm();
    await user.type(screen.getByLabelText("Origin"), " Enschede ");
    await user.type(screen.getByLabelText("Destination"), "Hengelo");
    await user.click(screen.getByRole("button", { name: "Search journeys" }));

    expect(onSearch).toHaveBeenCalledWith({
      origin: "Enschede",
      destination: "Hengelo",
      date: new Date(2026, 9, 21),
      nrOfPassengers: 1,
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps what was typed after a failed submit", async () => {
    const { user } = renderForm();
    await user.type(screen.getByLabelText("Origin"), "Enschede");
    await user.click(screen.getByRole("button", { name: "Search journeys" }));
    expect(screen.getByLabelText("Origin")).toHaveValue("Enschede");
  });

  it("clears a field's message once it is valid, and only that field's", async () => {
    const { user } = renderForm();
    await user.click(screen.getByRole("button", { name: "Search journeys" }));
    await user.type(screen.getByLabelText("Origin"), "Enschede");

    expect(screen.queryByText("Enter an origin")).not.toBeInTheDocument();
    expect(screen.getByText("Enter a destination")).toBeInTheDocument();
    expect(screen.getByLabelText("Origin")).not.toHaveAttribute("aria-invalid");
  });

  it("does not nag before the first submit", async () => {
    const { user } = renderForm();
    await user.type(screen.getByLabelText("Origin"), "E");
    await user.clear(screen.getByLabelText("Origin"));
    expect(screen.queryByText("Enter an origin")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("rejects the same origin and destination on the destination field", async () => {
    const { user } = renderForm();
    await user.type(screen.getByLabelText("Origin"), "Enschede");
    await user.type(screen.getByLabelText("Destination"), "enschede");
    await user.click(screen.getByRole("button", { name: "Search journeys" }));
    expect(
      screen.getByText("Destination must differ from origin"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Destination")).toHaveFocus();
  });

  it("rejects passengers out of range", async () => {
    const { user } = renderForm();
    const passengers = screen.getByLabelText("Passengers");
    await user.clear(passengers);
    await user.type(passengers, "11");
    await user.click(screen.getByRole("button", { name: "Search journeys" }));
    expect(
      screen.getByText("Choose between 1 and 10 passengers"),
    ).toBeInTheDocument();
  });

  it("pre-fills from the URL and shows its errors on load", () => {
    renderForm({
      defaultValues: {
        origin: "Enschede",
        destination: "Hengelo",
        date: "2025-04-20",
        passengers: "2",
      },
      initialErrors: { date: "Choose a date from today onwards" },
    });
    expect(screen.getByLabelText("Origin")).toHaveValue("Enschede");
    expect(screen.getByLabelText("Travel date")).toHaveValue("2025-04-20");
    expect(screen.getByLabelText("Passengers")).toHaveValue(2);
    expect(screen.getByLabelText("Travel date")).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "1 field needs attention",
    );
    expect(
      screen.getByText("Choose a date from today onwards"),
    ).toBeInTheDocument();
  });

  it("has no accessibility violations before and after a failed submit", async () => {
    const { container, user } = renderForm();
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole("button", { name: "Search journeys" }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
