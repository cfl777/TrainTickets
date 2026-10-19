import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSuggestStations,
  matchStations,
  stations,
  suggestStations,
} from "../stations.ts";

describe("stations", () => {
  it("lists every station of the timetable once, sorted", () => {
    expect(stations.map((s) => s.name)).toEqual([
      "Almelo",
      "Enschede",
      "Hengelo",
    ]);
    expect(Object.isFrozen(stations)).toBe(true);
  });
});

describe("matchStations", () => {
  it.each([
    ["E", ["Enschede"]],
    ["en", ["Enschede"]],
    ["ENSCH", ["Enschede"]],
    [" hen", ["Hengelo"]],
    ["Énsch", ["Enschede"]],
    ["Enschede", ["Enschede"]],
  ])("matches %j by prefix, ignoring case, accents and spaces", (q, names) => {
    expect(matchStations(q).map((s) => s.name)).toEqual(names);
  });

  it.each(["nsch", "Zwolle", "Enschedee"])("matches nothing for %j", (q) => {
    expect(matchStations(q)).toEqual([]);
  });

  it.each(["", "   "])("lists every station for the empty query %j", (q) => {
    expect(matchStations(q)).toEqual(stations);
  });
});

describe("createSuggestStations", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves with the matches", async () => {
    const suggest = createSuggestStations({ delayMs: 0 });
    await expect(suggest("A")).resolves.toEqual([
      { id: "almelo", name: "Almelo" },
    ]);
  });

  it("waits the configured delay by default", async () => {
    vi.useFakeTimers();
    let settled = false;
    const pending = suggestStations("H").then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(149);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(settled).toBe(true);
  });
});
