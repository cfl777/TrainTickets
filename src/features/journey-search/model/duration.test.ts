import { describe, expect, it } from "vitest";
import {
  journeyDuration,
  toHoursAndMinutes,
  toIsoDuration,
} from "./duration.ts";
import type { Journey } from "./types.ts";

function journey(departure: Date, arrival: Date): Journey {
  return { departure, arrival, price: { value: 0, currency: "EUR" } };
}

describe("journeyDuration", () => {
  it.each([
    [new Date(2026, 9, 21, 9, 0), new Date(2026, 9, 21, 9, 10), 10],
    [new Date(2026, 9, 21, 14, 0), new Date(2026, 9, 21, 14, 15), 15],
    [new Date(2026, 9, 21, 17, 0), new Date(2026, 9, 21, 19, 30), 150],
    [new Date(2026, 9, 21, 23, 50), new Date(2026, 9, 22, 0, 20), 30],
  ])("from %o to %o is %i minutes", (departure, arrival, minutes) => {
    expect(journeyDuration(journey(departure, arrival))).toBe(minutes);
  });

  it("rounds stray seconds to whole minutes", () => {
    const departure = new Date(2026, 9, 21, 9, 0, 0);
    const arrival = new Date(2026, 9, 21, 9, 10, 29);
    expect(journeyDuration(journey(departure, arrival))).toBe(10);
  });
});

describe("toHoursAndMinutes", () => {
  it.each([
    [10, 0, 10],
    [60, 1, 0],
    [150, 2, 30],
    [0, 0, 0],
  ])("%i minutes is %ih %im", (total, hours, minutes) => {
    expect(toHoursAndMinutes(total)).toEqual({ hours, minutes });
  });
});

describe("toIsoDuration", () => {
  it.each([
    [10, "PT10M"],
    [150, "PT2H30M"],
    [120, "PT2H"],
    [0, "PT0M"],
  ])("%i minutes is %s", (minutes, iso) => {
    expect(toIsoDuration(minutes)).toBe(iso);
  });
});
