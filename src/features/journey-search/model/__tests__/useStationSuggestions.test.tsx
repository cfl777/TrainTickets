import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createSearchJourneys } from "../../api/searchJourneys.ts";
import { createSuggestStations } from "../../api/stations.ts";
import { ApiProvider } from "../useSearchApi.tsx";
import { useStationSuggestions } from "../useStationSuggestions.ts";

function setup(suggest = createSuggestStations({ delayMs: 0 })) {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ApiProvider api={createSearchJourneys({ delayMs: 0 })} suggest={suggest}>
        {children}
      </ApiProvider>
    </QueryClientProvider>
  );
  return renderHook(
    (props: { query: string }) => useStationSuggestions(props.query),
    { wrapper, initialProps: { query: "" } },
  );
}

const names = (result: { stations: readonly { name: string }[] }) =>
  result.stations.map((station) => station.name);

describe("useStationSuggestions", () => {
  it("lists every station for the empty prefix, loading first", async () => {
    const { result } = setup();
    expect(result.current).toEqual({ stations: [], isLoading: true });
    await waitFor(() => {
      expect(names(result.current)).toEqual(["Almelo", "Enschede", "Hengelo"]);
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("asks once per normalised prefix", async () => {
    const suggest = vi.fn(createSuggestStations({ delayMs: 0 }));
    const { result, rerender } = setup(suggest);

    rerender({ query: "En" });
    await waitFor(() => {
      expect(names(result.current)).toEqual(["Enschede"]);
    });
    rerender({ query: "" });
    rerender({ query: " en " });
    await waitFor(() => {
      expect(names(result.current)).toEqual(["Enschede"]);
    });
    expect(suggest.mock.calls).toEqual([[""], ["en"]]);
  });

  it("keeps the previous list while the next prefix loads", async () => {
    const { result, rerender } = setup();
    rerender({ query: "H" });
    await waitFor(() => {
      expect(names(result.current)).toEqual(["Hengelo"]);
    });
    rerender({ query: "He" });
    expect(names(result.current)).toEqual(["Hengelo"]);
    expect(result.current.isLoading).toBe(false);
  });
});
