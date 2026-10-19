import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import {
  formatLocalDate,
  startOfLocalDay,
} from "../../../../shared/lib/localDate.ts";
import { createSearchJourneys } from "../../api/searchJourneys.ts";
import { createSuggestStations } from "../../api/stations.ts";
import { ApiProvider } from "../../model/useSearchApi.tsx";
import { SearchPage } from "../SearchPage.tsx";
// Imported once so the lazy import inside StationField resolves at once instead of
// loading react-aria-components mid-test.
import "../StationComboBox.tsx";

const today = startOfLocalDay(new Date());
const todayValue = formatLocalDate(today);
const tomorrowValue = formatLocalDate(
  new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
);

function renderPage(url: string) {
  window.history.replaceState(null, "", url);
  const api = vi.fn(createSearchJourneys({ delayMs: 0 }));
  const utils = render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiProvider api={api} suggest={createSuggestStations({ delayMs: 0 })}>
        <SearchPage />
      </ApiProvider>
    </QueryClientProvider>,
  );
  return { ...utils, api, user: userEvent.setup() };
}

/** The station fields swap from a plain input to the lazy combobox; tests that touch them wait for it. */
const station = (name: "Origin" | "Destination") =>
  screen.findByRole("combobox", { name });

describe("SearchPage", () => {
  beforeEach(() => {
    document.title = "";
  });

  it("is idle without a query string: form, empty status, app title", async () => {
    const { container, api } = renderPage("/");
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Train journeys");
    // The heading sits in the ticket's stub, inside the search landmark
    // (queried by element: Testing Library's role map predates <search>).
    expect(container.querySelector("search")).toContainElement(heading);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(document.title).toBe("Train journeys");
    expect(api).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("loads, then shows the table, the count and the search in the title", async () => {
    const { container } = renderPage(
      `/?origin=Enschede&destination=Hengelo&date=${tomorrowValue}&passengers=2`,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Searching for journeys",
    );

    const table = await screen.findByRole("table");
    expect(table).toHaveAccessibleName(/Enschede to Hengelo/);
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(
      screen.getByRole("columnheader", { name: "Total for 2 passengers" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2 journeys found");
    expect(document.title).toBe("Enschede to Hengelo | Train journeys");
    expect(
      screen.getByRole("region", { name: "Search results" }),
    ).not.toHaveFocus();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("says when nothing matches and keeps the form filled", async () => {
    const { container } = renderPage(
      `/?origin=Enschede&destination=Hengelo&date=${todayValue}&passengers=1`,
    );
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "No journeys found for this search",
      );
    });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(await station("Origin")).toHaveValue("Enschede");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows the field error for an invalid URL and never calls the api", async () => {
    const { container, api } = renderPage(
      `/?origin=Enschede&destination=Hengelo&date=${tomorrowValue}`,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "1 field needs attention",
    );
    expect(
      screen.getByText("Choose between 1 and 10 passengers"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Passengers")).toHaveFocus();
    expect(await station("Destination")).toHaveValue("Hengelo");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(api).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows the unknown-station message for a URL with an unknown origin and never calls the api", async () => {
    const { container, api } = renderPage(
      `/?origin=Zwolle&destination=Hengelo&date=${tomorrowValue}&passengers=2`,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "1 field needs attention",
    );
    expect(
      screen.getByText("Choose a station from the list"),
    ).toBeInTheDocument();
    const origin = await station("Origin");
    expect(origin).toHaveValue("Zwolle");
    expect(origin).toHaveAttribute("aria-invalid", "true");
    expect(origin).toHaveFocus();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(api).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows a focused error with a retry that searches again", async () => {
    const { container, api, user } = renderPage(
      `/?origin=Almelo&destination=Enschede&date=${tomorrowValue}&passengers=2`,
    );
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveFocus();
    expect(api).toHaveBeenCalledTimes(1);
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => {
      expect(api).toHaveBeenCalledTimes(2);
    });
  });

  it("focuses the first invalid station field on load, even without focus events", async () => {
    // A page loaded without window focus (a link opened in a background tab)
    // moves document.activeElement on focus() but receives no focus events
    // until the window is focused. Swallowing focusin above React's root
    // listener reproduces that; the handover to the lazy combobox must not
    // depend on the event.
    const swallow = (event: Event) => {
      event.stopImmediatePropagation();
    };
    document.addEventListener("focusin", swallow, true);
    try {
      const { container } = renderPage(
        `/?origin=&destination=Hengelo&date=${tomorrowValue}&passengers=2`,
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        "1 field needs attention",
      );
      const origin = await station("Origin");
      expect(origin).toHaveAttribute("aria-invalid", "true");
      expect(origin).toHaveFocus();
      expect(await axe(container)).toHaveNoViolations();
    } finally {
      document.removeEventListener("focusin", swallow, true);
    }
  });

  it("says what the results are for once the form changes, until the next search", async () => {
    const { container, user } = renderPage(
      `/?origin=Enschede&destination=Hengelo&date=${tomorrowValue}&passengers=2`,
    );
    await screen.findByRole("table");
    const destination = await station("Destination");
    await user.type(destination, " {Backspace}{Escape}");
    expect(screen.getByRole("status")).toHaveTextContent("2 journeys found");

    await user.clear(destination);
    await user.type(destination, "Almelo{Escape}");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Results are for Enschede to Hengelo. Search again to update.",
    );
    expect(screen.getByRole("table")).toHaveAccessibleName(
      /Enschede to Hengelo/,
    );
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(destination).toHaveFocus();
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole("button", { name: "Search journeys" }));
    expect(
      await screen.findByRole("table", { name: /Enschede to Almelo/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2 journeys found");
  });

  it("keeps the retry for the failed search and says which search it is for once the form changes", async () => {
    const { user } = renderPage(
      `/?origin=Almelo&destination=Enschede&date=${tomorrowValue}&passengers=2`,
    );
    await screen.findByRole("alert");
    const passengers = screen.getByLabelText("Passengers");
    await user.clear(passengers);
    await user.type(passengers, "3");

    expect(screen.getByRole("status")).toHaveTextContent(
      "Results are for Almelo to Enschede. Search again to update.",
    );
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  it("writes the URL on submit and shows the results", async () => {
    const { user } = renderPage("/");
    // Escape closes each lookup popup, which hides the rest of the page while open.
    await user.type(await station("Origin"), "Enschede{Escape}");
    await user.type(await station("Destination"), "Almelo{Escape}");
    await user.click(screen.getByRole("button", { name: "Search journeys" }));

    expect(window.location.search).toBe(
      `?origin=Enschede&destination=Almelo&date=${tomorrowValue}&passengers=1`,
    );
    await screen.findByRole("table");
    expect(screen.getByRole("status")).toHaveTextContent("2 journeys found");
    expect(await station("Origin")).toHaveValue("Enschede");
    expect(
      screen.getByRole("region", { name: "Search results" }),
    ).toHaveFocus();
  });
});
