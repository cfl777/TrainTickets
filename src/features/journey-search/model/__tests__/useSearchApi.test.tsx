import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createSearchJourneys } from "../../api/searchJourneys.ts";
import { ApiProvider, useSearchApi } from "../useSearchApi.tsx";

describe("useSearchApi", () => {
  it("returns the api from the nearest provider", () => {
    const api = createSearchJourneys({ delayMs: 0 });
    const { result } = renderHook(() => useSearchApi(), {
      wrapper: ({ children }) => (
        <ApiProvider api={api}>{children}</ApiProvider>
      ),
    });
    expect(result.current).toBe(api);
  });

  it("throws without a provider", () => {
    expect(() => renderHook(() => useSearchApi())).toThrow(
      "useSearchApi must be used inside an ApiProvider",
    );
  });
});
