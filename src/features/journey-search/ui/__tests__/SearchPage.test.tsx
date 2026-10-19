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
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Train journeys",
    );
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

  it("shows a focused error with a retry that searches again", async () => {
    const { container, api, user } = renderPage(
      `/?origin=error&destination=Hengelo&date=${tomorrowValue}&passengers=2`,
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
