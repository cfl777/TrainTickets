import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createSearchJourneys } from "../../api/searchJourneys.ts";
import { createSuggestStations } from "../../api/stations.ts";
import { ApiProvider } from "../../model/useSearchApi.tsx";
import { StationField } from "../StationField.tsx";

describe("StationField", () => {
  // One test: React.lazy resolves once per module, so the fallback can only be
  // observed on the first render in this file.
  it("shows a plain input first, then hands its id, name, text and focus to the combobox", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ApiProvider
          api={createSearchJourneys({ delayMs: 0 })}
          suggest={createSuggestStations({ delayMs: 0 })}
        >
          <StationField
            id="destination"
            label="Destination"
            placeholder="Hengelo"
            defaultValue="Al"
            error="Enter a destination"
          />
        </ApiProvider>
      </QueryClientProvider>,
    );

    const fallback = screen.getByRole("textbox", { name: "Destination" });
    expect(fallback).toHaveAttribute("id", "destination");
    expect(fallback).toHaveAttribute("name", "destination");
    expect(fallback).toHaveAttribute("placeholder", "Hengelo");
    expect(fallback).toHaveValue("Al");
    expect(fallback).toHaveAccessibleDescription("Enter a destination");

    fallback.focus();
    fireEvent.change(fallback, { target: { value: "Hen" } });

    const combobox = await screen.findByRole(
      "combobox",
      { name: "Destination" },
      { timeout: 15_000 },
    );
    expect(combobox).toHaveAttribute("id", "destination");
    expect(combobox).toHaveAttribute("name", "destination");
    expect(combobox).toHaveAttribute("placeholder", "Hengelo");
    expect(combobox).toHaveValue("Hen");
    expect(combobox).toHaveFocus();
    expect(combobox).toHaveAccessibleDescription("Enter a destination");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  }, 20_000);
});
