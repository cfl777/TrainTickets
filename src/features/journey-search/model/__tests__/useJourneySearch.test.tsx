import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createSearchJourneys } from "../../api/searchJourneys.ts";
import { createSuggestStations } from "../../api/stations.ts";
import type { JourneyParameters, Journeys } from "../types.ts";
import {
  useJourneySearch,
  type JourneySearchState,
} from "../useJourneySearch.ts";
import { ApiProvider } from "../useSearchApi.tsx";

const suggest = createSuggestStations({ delayMs: 0 });

const tuesday = new Date(2026, 9, 20, 15, 30);
const now = () => tuesday;
const locales = ["en-US"];
const valid =
  "?origin=Enschede&destination=Hengelo&date=2026-10-21&passengers=2";

function setup(
  search: string,
  api = createSearchJourneys({ delayMs: 0, now }),
  client = new QueryClient(),
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ApiProvider api={api} suggest={suggest}>
        {children}
      </ApiProvider>
    </QueryClientProvider>
  );
  return renderHook(
    (props: { search: string }) =>
      useJourneySearch(props.search, { locales, now }),
    { wrapper, initialProps: { search } },
  );
}

async function settled(result: { current: JourneySearchState }) {
  await waitFor(() => {
    expect(["success", "error"]).toContain(result.current.kind);
  });
  return result.current;
}

describe("useJourneySearch", () => {
  it("is idle without a query string and does not call the api", () => {
    const api = vi.fn(createSearchJourneys({ delayMs: 0, now }));
    const { result } = setup("", api);
    expect(result.current).toEqual({ kind: "idle" });
    expect(api).not.toHaveBeenCalled();
  });

  it("is invalid with the field errors and the raw values, api not called", () => {
    const api = vi.fn(createSearchJourneys({ delayMs: 0, now }));
    const { result } = setup(
      "?origin=Enschede&destination=Hengelo&date=2026-10-21",
      api,
    );
    const state = result.current;
    expect(state.kind).toBe("invalid");
    if (state.kind !== "invalid") return;
    expect(state.errors).toEqual({
      passengers: "Choose between 1 and 10 passengers",
    });
    expect(state.raw.origin).toBe("Enschede");
    expect(api).not.toHaveBeenCalled();
  });

  it("loads, then succeeds with rows, count and caption", async () => {
    const { result } = setup(valid);
    expect(result.current.kind).toBe("loading");

    const state = await settled(result);
    expect(state.kind).toBe("success");
    if (state.kind !== "success") return;
    expect(state.count).toBe(2);
    expect(state.passengers).toBe(2);
    expect(state.rows.map((row) => row.departure.text)).toEqual([
      "9:00 AM",
      "2:00 PM",
    ]);
    expect(state.caption).toBe(
      "Enschede to Hengelo on Wednesday, October 21, 2026, 2 passengers",
    );
  });

  it("succeeds with zero rows when nothing matches", async () => {
    const { result } = setup(
      "?origin=Enschede&destination=Hengelo&date=2026-10-20&passengers=1",
    );
    const state = await settled(result);
    expect(state.kind).toBe("success");
    if (state.kind !== "success") return;
    expect(state.count).toBe(0);
    expect(state.caption).toContain("1 passenger");
  });

  it("reports an error with a message and a working retry", async () => {
    const api = vi.fn(createSearchJourneys({ delayMs: 0, now }));
    const { result } = setup(
      "?origin=Almelo&destination=Enschede&date=2026-10-21&passengers=2",
      api,
    );
    const state = await settled(result);
    expect(state.kind).toBe("error");
    if (state.kind !== "error") return;
    expect(state.message).toBe(
      "Something went wrong while searching for journeys.",
    );
    expect(api).toHaveBeenCalledTimes(1);

    state.retry();
    await waitFor(() => {
      expect(api).toHaveBeenCalledTimes(2);
    });
  });

  it("is loading again while a retry is in flight", async () => {
    let calls = 0;
    let releaseRetry: () => void = () => undefined;
    const api = (): Promise<Journeys> => {
      calls += 1;
      return calls === 1
        ? Promise.reject(new Error("first attempt fails"))
        : new Promise<Journeys>((resolve) => {
            releaseRetry = () => {
              resolve([]);
            };
          });
    };
    const { result } = setup(valid, api);
    const failed = await settled(result);
    expect(failed.kind).toBe("error");
    if (failed.kind !== "error") return;

    failed.retry();
    await waitFor(() => {
      expect(result.current.kind).toBe("loading");
    });

    releaseRetry();
    const retried = await settled(result);
    expect(retried.kind).toBe("success");
  });

  it("never shows a response for a superseded search", async () => {
    let releaseFirst: (journeys: Journeys) => void = () => undefined;
    const real = createSearchJourneys({ delayMs: 0, now });
    const api = (params: JourneyParameters) =>
      params.destination === "Hengelo"
        ? new Promise<Journeys>((resolve) => {
            releaseFirst = resolve;
          })
        : real(params);

    const { result, rerender } = setup(valid, api);
    expect(result.current.kind).toBe("loading");

    rerender({
      search:
        "?origin=Enschede&destination=Almelo&date=2026-10-21&passengers=2",
    });
    const almelo = await settled(result);
    expect(almelo.kind).toBe("success");
    if (almelo.kind !== "success") return;
    expect(almelo.rows.map((row) => row.departure.text)).toEqual([
      "9:00 AM",
      "12:15 PM",
    ]);

    releaseFirst(
      await real({
        origin: "Enschede",
        destination: "Hengelo",
        date: new Date(2026, 9, 21),
        nrOfPassengers: 2,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current).toBe(almelo);
  });

  it("validates against the real clock when no clock is given", async () => {
    const api = createSearchJourneys({ delayMs: 0, now });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={new QueryClient()}>
        <ApiProvider api={api} suggest={suggest}>
          {children}
        </ApiProvider>
      </QueryClientProvider>
    );
    const farFuture =
      "?origin=Enschede&destination=Hengelo&date=2099-01-01&passengers=1";
    const { result } = renderHook(
      () => useJourneySearch(farFuture, { locales }),
      { wrapper },
    );
    expect(result.current.kind).not.toBe("invalid");
    const state = await settled(result);
    expect(state.kind).toBe("success");
  });

  it("serves a repeated search from the cache without loading", async () => {
    const client = new QueryClient();
    const first = setup(valid, undefined, client);
    await settled(first.result);
    first.unmount();

    const second = setup(valid, undefined, client);
    expect(second.result.current.kind).toBe("success");
  });
});
