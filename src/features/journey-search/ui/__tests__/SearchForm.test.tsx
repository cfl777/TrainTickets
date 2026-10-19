import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { createSearchJourneys } from "../../api/searchJourneys.ts";
import { createSuggestStations } from "../../api/stations.ts";
import { ApiProvider } from "../../model/useSearchApi.tsx";
import { SearchForm } from "../SearchForm.tsx";
// Imported once so the lazy import inside StationField resolves at once instead of
// loading react-aria-components mid-test.
import "../StationComboBox.tsx";

const now = () => new Date(2026, 9, 20, 15, 30);

/** Renders inside the providers the station lookup needs and waits for both comboboxes to replace their fallbacks. */
async function renderForm(
  props: Partial<Parameters<typeof SearchForm>[0]> = {},
) {
  const onSearch = vi.fn();
  const utils = render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiProvider
        api={createSearchJourneys({ delayMs: 0 })}
        suggest={createSuggestStations({ delayMs: 0 })}
      >
        <SearchForm
          defaultValues={null}
          initialErrors={null}
          onSearch={onSearch}
          now={now}
          {...props}
        />
      </ApiProvider>
    </QueryClientProvider>,
  );
  await screen.findByRole("combobox", { name: "Origin" });
  await screen.findByRole("combobox", { name: "Destination" });
  return { ...utils, onSearch, user: userEvent.setup() };
}

const origin = () => screen.getByRole("combobox", { name: "Origin" });
const destination = () => screen.getByRole("combobox", { name: "Destination" });
const submit = () => screen.getByRole("button", { name: "Search journeys" });

// While a lookup popup is open, React Aria hides the rest of the page from
// assistive tech, as a screen reader expects; typing ends with Escape so the
// next query can see the other controls, the way a visitor's click would.
const typed = (text: string) => `${text}{Escape}`;

describe("SearchForm", () => {
  it("defaults to tomorrow and one passenger, with today as the earliest date", async () => {
    await renderForm();
    expect(screen.getByLabelText("Travel date")).toHaveValue("2026-10-21");
    expect(screen.getByLabelText("Travel date")).toHaveAttribute(
      "min",
      "2026-10-20",
    );
    expect(screen.getByLabelText("Passengers")).toHaveValue(1);
    expect(submit()).toBeEnabled();
  });

  it("turns native validation bubbles off", async () => {
    const { container } = await renderForm();
    expect(container.querySelector("form")).toHaveAttribute("novalidate");
  });

  it("marks the fields, announces the count and focuses the first invalid field on an invalid submit", async () => {
    const { user, onSearch } = await renderForm();
    await user.click(submit());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "2 fields need attention",
    );
    expect(origin()).toHaveFocus();
    expect(origin()).toHaveAttribute("aria-invalid", "true");
    expect(origin()).toHaveAccessibleDescription("Enter an origin");
    expect(screen.getByText("Enter a destination")).toBeInTheDocument();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("refocuses the first invalid field on a repeated failed submit", async () => {
    const { user } = await renderForm();
    await user.click(submit());
    await user.click(screen.getByLabelText("Passengers"));
    expect(origin()).not.toHaveFocus();
    await user.click(submit());
    expect(origin()).toHaveFocus();
  });

  it("calls onSearch with the validated parameters and announces nothing", async () => {
    const { user, onSearch } = await renderForm();
    await user.type(origin(), typed(" Enschede "));
    await user.type(destination(), typed("Hengelo"));
    await user.click(submit());

    expect(onSearch).toHaveBeenCalledWith({
      origin: "Enschede",
      destination: "Hengelo",
      date: new Date(2026, 9, 21),
      nrOfPassengers: 1,
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("submits a station chosen from the lookup", async () => {
    const { user, onSearch } = await renderForm();
    await user.type(origin(), "en");
    await screen.findByRole("option", { name: "Enschede" });
    await user.keyboard("{ArrowDown}{Enter}");
    expect(origin()).toHaveValue("Enschede");

    await user.type(destination(), "al");
    await user.click(await screen.findByRole("option", { name: "Almelo" }));
    await user.click(submit());

    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({ origin: "Enschede", destination: "Almelo" }),
    );
  });

  it("keeps what was typed after a failed submit", async () => {
    const { user } = await renderForm();
    await user.type(origin(), typed("Enschede"));
    await user.click(submit());
    expect(origin()).toHaveValue("Enschede");
  });

  it("clears a field's message once it is valid, and only that field's", async () => {
    const { user } = await renderForm();
    await user.click(submit());
    await user.type(origin(), "Enschede");

    expect(screen.queryByText("Enter an origin")).not.toBeInTheDocument();
    expect(screen.getByText("Enter a destination")).toBeInTheDocument();
    expect(origin()).not.toHaveAttribute("aria-invalid");
  });

  it("does not nag before the first submit", async () => {
    const { user } = await renderForm();
    await user.type(origin(), "E");
    await user.clear(origin());
    expect(screen.queryByText("Enter an origin")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("rejects the same origin and destination on the destination field", async () => {
    const { user } = await renderForm();
    await user.type(origin(), typed("Enschede"));
    await user.type(destination(), typed("enschede"));
    await user.click(submit());
    expect(
      screen.getByText("Destination must differ from origin"),
    ).toBeInTheDocument();
    expect(destination()).toHaveFocus();
  });

  it("rejects an unknown station on its own field and focuses it", async () => {
    const { user, onSearch } = await renderForm();
    await user.type(origin(), typed("Zwolle"));
    await user.type(destination(), typed("Hengelo"));
    await user.click(submit());

    expect(origin()).toHaveFocus();
    expect(origin()).toHaveAttribute("aria-invalid", "true");
    expect(origin()).toHaveAccessibleDescription(
      "Choose a station from the list",
    );
    expect(origin()).toHaveValue("Zwolle");
    expect(destination()).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "1 field needs attention",
    );
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("clears the unknown-station message once the full name is typed", async () => {
    const { user } = await renderForm();
    await user.type(origin(), typed("Ensch"));
    await user.click(submit());
    expect(
      screen.getByText("Choose a station from the list"),
    ).toBeInTheDocument();

    await user.type(origin(), "ede");
    expect(
      screen.queryByText("Choose a station from the list"),
    ).not.toBeInTheDocument();
  });

  it("says so at once when the destination is typed as the origin, before any submit", async () => {
    const { user } = await renderForm();
    await user.type(origin(), typed("Enschede"));
    await user.type(destination(), typed("enschede"));

    expect(
      screen.getByText("Destination must differ from origin"),
    ).toBeInTheDocument();
    expect(destination()).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("clears the same-station message when another origin is chosen from the list", async () => {
    const { user } = await renderForm();
    await user.type(destination(), typed("Enschede"));
    await user.type(origin(), typed("Enschede"));
    expect(
      screen.getByText("Destination must differ from origin"),
    ).toBeInTheDocument();

    await user.clear(origin());
    await user.type(origin(), "h");
    await screen.findByRole("option", { name: "Hengelo" });
    await user.keyboard("{ArrowDown}{Enter}");

    expect(origin()).toHaveValue("Hengelo");
    expect(
      screen.queryByText("Destination must differ from origin"),
    ).not.toBeInTheDocument();
  });

  it("clears the same-station message when the origin changes, without nagging about the empty origin", async () => {
    const { user } = await renderForm();
    await user.type(origin(), typed("Enschede"));
    await user.type(destination(), typed("Enschede"));
    await user.clear(origin());
    await user.keyboard("{Escape}");

    expect(
      screen.queryByText("Destination must differ from origin"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Enter an origin")).not.toBeInTheDocument();
    expect(destination()).not.toHaveAttribute("aria-invalid");
  });

  it("greys the chosen origin out in the destination list", async () => {
    const { user } = await renderForm();
    await user.type(origin(), "en");
    await user.click(await screen.findByRole("option", { name: "Enschede" }));
    await user.click(
      screen.getByRole("button", { name: "Show stations Destination" }),
    );

    expect(
      await screen.findByRole("option", { name: "Enschede Origin" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("option", { name: "Hengelo" })).not.toHaveAttribute(
      "aria-disabled",
    );
    expect(screen.getByText("3 stations")).toBeInTheDocument();
  });

  it("rejects passengers out of range", async () => {
    const { user } = await renderForm();
    const passengers = screen.getByLabelText("Passengers");
    await user.clear(passengers);
    await user.type(passengers, "11");
    await user.click(submit());
    expect(
      screen.getByText("Choose between 1 and 10 passengers"),
    ).toBeInTheDocument();
  });

  it("pre-fills from the URL and shows its errors on load", async () => {
    await renderForm({
      defaultValues: {
        origin: "Enschede",
        destination: "Hengelo",
        date: "2025-04-20",
        passengers: "2",
      },
      initialErrors: { date: "Choose a date from today onwards" },
    });
    expect(origin()).toHaveValue("Enschede");
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

  it("shows a key the URL omits as empty, not as the default", async () => {
    await renderForm({
      defaultValues: {
        origin: "Enschede",
        destination: "Hengelo",
        date: "2026-10-21",
        passengers: null,
      },
      initialErrors: { passengers: "Choose between 1 and 10 passengers" },
    });
    expect(screen.getByLabelText("Passengers")).toHaveValue(null);
    expect(screen.getByLabelText("Passengers")).toHaveFocus();
    expect(screen.getByLabelText("Travel date")).toHaveValue("2026-10-21");
  });

  describe("onDirtyChange", () => {
    const searched = {
      origin: "Enschede",
      destination: "Hengelo",
      date: "2026-10-21",
      passengers: "2",
    };

    it("reports true once a field differs from the searched values, false when the same value is retyped", async () => {
      const onDirtyChange = vi.fn();
      const { user } = await renderForm({
        defaultValues: searched,
        onDirtyChange,
      });
      await user.clear(destination());
      expect(onDirtyChange.mock.calls).toEqual([[true]]);

      await user.type(destination(), typed(" hengelo"));
      expect(onDirtyChange.mock.calls).toEqual([[true], [false]]);
    });

    it("does not count a space typed and deleted as a change", async () => {
      const onDirtyChange = vi.fn();
      const { user } = await renderForm({
        defaultValues: searched,
        onDirtyChange,
      });
      await user.type(destination(), " {Backspace}");
      expect(onDirtyChange).not.toHaveBeenCalled();
    });

    it("reports a station chosen from the lookup, which fires no change event", async () => {
      const onDirtyChange = vi.fn();
      const { user } = await renderForm({
        defaultValues: searched,
        onDirtyChange,
      });
      await user.clear(destination());
      await user.keyboard("{Escape}");
      await user.click(
        screen.getByRole("button", { name: "Show stations Destination" }),
      );
      await user.click(await screen.findByRole("option", { name: "Hengelo" }));
      expect(destination()).toHaveValue("Hengelo");
      expect(onDirtyChange.mock.calls).toEqual([[true], [false]]);
    });

    it("reports nothing before a search", async () => {
      const onDirtyChange = vi.fn();
      const { user } = await renderForm({ onDirtyChange });
      await user.type(origin(), typed("Enschede"));
      expect(onDirtyChange).not.toHaveBeenCalled();
    });
  });

  it("has no accessibility violations before and after a failed submit", async () => {
    const { container, user } = await renderForm();
    expect(await axe(container)).toHaveNoViolations();
    await user.click(submit());
    expect(await axe(container)).toHaveNoViolations();
  });
});
