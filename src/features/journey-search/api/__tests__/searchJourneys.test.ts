import { afterEach, describe, expect, it, vi } from "vitest";
import { buildJourneys } from "../fixtures.ts";
import {
  createSearchJourneys,
  filterJourneys,
  InvalidParametersError,
  searchJourneys,
  SearchError,
} from "../searchJourneys.ts";
import { timetable } from "../timetable.ts";

const tuesday = new Date(2026, 9, 20, 15, 30);
const tomorrow = new Date(2026, 9, 21);
const journeys = buildJourneys(timetable, tuesday);

const base = {
  origin: "Enschede",
  destination: "Hengelo",
  date: tomorrow,
  nrOfPassengers: 2,
};

describe("filterJourneys", () => {
  it("returns the matching services for the day, sorted by departure", () => {
    const result = filterJourneys(journeys, base);
    expect(result).toHaveLength(2);
    expect(result.map((j) => j.departure.getHours())).toEqual([9, 14]);
    expect(result.map((j) => j.arrival.getMinutes())).toEqual([10, 15]);
  });

  it("sorts by departure even when the input is out of order", () => {
    const result = filterJourneys(journeys.toReversed(), base);
    expect(result.map((j) => j.departure.getHours())).toEqual([9, 14]);
  });

  it("totals the price per passenger in whole cents", () => {
    const [first, second] = filterJourneys(journeys, {
      ...base,
      nrOfPassengers: 3,
    });
    expect(first?.price).toEqual({ value: 18, currency: "EUR" });
    expect(second?.price).toEqual({ value: 15, currency: "EUR" });
  });

  it("keeps fractional totals exact", () => {
    const [almelo] = filterJourneys(journeys, {
      ...base,
      destination: "Almelo",
      nrOfPassengers: 3,
    });
    expect(almelo?.price.value).toBe(22.5);
  });

  it.each([
    ["enschede ", "HENGELO"],
    [" Enschedé", "hengelo"],
  ])("folds case, accents and whitespace (%j -> %j)", (origin, destination) => {
    expect(
      filterJourneys(journeys, { ...base, origin, destination }),
    ).toHaveLength(2);
  });

  it.each([
    ["Ensch", "Hengelo", "a prefix"],
    ["Enschede", "Amsterdam", "an unknown station"],
    ["Enschede", "Enschede", "the same station"],
  ])("returns no journeys for %j -> %j (%s)", (origin, destination) => {
    expect(filterJourneys(journeys, { ...base, origin, destination })).toEqual(
      [],
    );
  });

  it("matches on the local calendar day, not the instant", () => {
    const lateTomorrow = new Date(2026, 9, 21, 23, 59);
    expect(
      filterJourneys(journeys, { ...base, date: lateTomorrow }),
    ).toHaveLength(2);
  });

  it.each([
    [new Date(2026, 9, 20), "today: the data starts tomorrow"],
    [new Date(2026, 9, 29), "day +9, past the served week"],
  ])("returns no journeys for %o (%s)", (date) => {
    expect(filterJourneys(journeys, { ...base, date })).toEqual([]);
  });

  it("serves the last day, +8", () => {
    expect(
      filterJourneys(journeys, { ...base, date: new Date(2026, 9, 28) }),
    ).toHaveLength(2);
  });

  it("returns a frozen array of frozen journeys", () => {
    const result = filterJourneys(journeys, base);
    expect(Object.isFrozen(result)).toBe(true);
    expect(
      result.every((j) => Object.isFrozen(j) && Object.isFrozen(j.price)),
    ).toBe(true);
  });
});

describe("createSearchJourneys", () => {
  const search = createSearchJourneys({ delayMs: 0, now: () => tuesday });

  it("resolves with the filtered journeys", async () => {
    await expect(search(base)).resolves.toEqual(filterJourneys(journeys, base));
  });

  it("rejects with SearchError for Almelo to Enschede, in any casing", async () => {
    await expect(
      search({ ...base, origin: " ALMELO ", destination: "enschede" }),
    ).rejects.toBeInstanceOf(SearchError);
  });

  it("does not fail the reverse route, Enschede to Almelo", async () => {
    await expect(
      search({ ...base, origin: "Enschede", destination: "Almelo" }),
    ).resolves.toHaveLength(2);
  });

  it.each<[Partial<typeof base>, string]>([
    [{ origin: "  " }, "blank origin"],
    [{ destination: "" }, "empty destination"],
    [{ date: new Date("not a date") }, "invalid date"],
    [{ nrOfPassengers: 0 }, "zero passengers"],
    [{ nrOfPassengers: 11 }, "eleven passengers"],
    [{ nrOfPassengers: 1.5 }, "fractional passengers"],
  ])("rejects %o with InvalidParametersError (%s)", async (overrides) => {
    await expect(search({ ...base, ...overrides })).rejects.toBeInstanceOf(
      InvalidParametersError,
    );
  });

  it("names its errors for instanceof and logs", () => {
    expect(new SearchError("x").name).toBe("SearchError");
    expect(new InvalidParametersError("x").name).toBe("InvalidParametersError");
  });
});

describe("the default searchJourneys instance", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits about half a second before answering", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(tuesday);
    let settled = false;
    const pending = searchJourneys(base).then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(499);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(settled).toBe(true);
  });
});
