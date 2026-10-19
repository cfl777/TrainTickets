import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createSearchJourneys } from "../../api/searchJourneys.ts";
import { createSuggestStations } from "../../api/stations.ts";
import {
  ApiProvider,
  useSearchApi,
  useSuggestStations,
} from "../useSearchApi.tsx";

describe("useSearchApi", () => {
  const api = createSearchJourneys({ delayMs: 0 });
  const suggest = createSuggestStations({ delayMs: 0 });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ApiProvider api={api} suggest={suggest}>
      {children}
    </ApiProvider>
  );

  it("returns the search api from the nearest provider", () => {
    const { result } = renderHook(() => useSearchApi(), { wrapper });
    expect(result.current).toBe(api);
  });

  it("returns the station lookup from the nearest provider", () => {
    const { result } = renderHook(() => useSuggestStations(), { wrapper });
    expect(result.current).toBe(suggest);
  });

  it("throws without a provider", () => {
    expect(() => renderHook(() => useSearchApi())).toThrow(
      "useSearchApi must be used inside an ApiProvider",
    );
  });
});
