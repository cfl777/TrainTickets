import { describe, expect, it } from "vitest";
import {
  formatLocalDate,
  isSameLocalDay,
  parseLocalDate,
  startOfLocalDay,
} from "./localDate.ts";

function parseOrFail(value: string): Date {
  const date = parseLocalDate(value);
  if (date === null) {
    throw new Error(`Expected ${value} to parse`);
  }
  return date;
}

describe("parseLocalDate and formatLocalDate", () => {
  it.each([
    "2026-10-20",
    "2026-01-01",
    "2026-12-31",
    "2026-03-29", // clocks forward, Europe/Amsterdam
    "2026-10-25", // clocks back, Europe/Amsterdam
    "2026-03-08", // clocks forward, America/New_York
    "2026-11-01", // clocks back, America/New_York
    "2028-02-29", // leap day
  ])("round-trips %s in the current time zone", (value) => {
    expect(formatLocalDate(parseOrFail(value))).toBe(value);
  });

  it("returns local midnight", () => {
    const date = parseOrFail("2026-10-20");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(9);
    expect(date.getDate()).toBe(20);
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
    expect(date.getSeconds()).toBe(0);
  });

  it.each([
    ["", "empty"],
    ["20-10-2026", "day first"],
    ["2026-1-5", "unpadded"],
    ["2026-10-20T00:00", "with a time"],
    ["2026/10/20", "slashes"],
    ["2026-02-30", "impossible day"],
    ["2026-13-01", "impossible month"],
    ["2026-00-10", "month zero"],
    ["2027-02-29", "not a leap year"],
  ])("rejects %j (%s)", (value) => {
    expect(parseLocalDate(value)).toBeNull();
  });
});

describe("startOfLocalDay", () => {
  it("returns local midnight of the same day", () => {
    const afternoon = new Date(2026, 9, 20, 13, 45, 30);
    expect(startOfLocalDay(afternoon)).toEqual(new Date(2026, 9, 20));
  });

  it("does not mutate its argument", () => {
    const afternoon = new Date(2026, 9, 20, 13, 45, 30);
    startOfLocalDay(afternoon);
    expect(afternoon.getHours()).toBe(13);
  });
});

describe("isSameLocalDay", () => {
  it("is true from the first to the last minute of a day", () => {
    expect(
      isSameLocalDay(
        new Date(2026, 9, 20, 0, 0),
        new Date(2026, 9, 20, 23, 59),
      ),
    ).toBe(true);
  });

  it("is false across local midnight", () => {
    expect(
      isSameLocalDay(
        new Date(2026, 9, 20, 23, 59),
        new Date(2026, 9, 21, 0, 0),
      ),
    ).toBe(false);
  });

  it("is false for the same day in a different month or year", () => {
    expect(isSameLocalDay(new Date(2026, 9, 20), new Date(2026, 10, 20))).toBe(
      false,
    );
    expect(isSameLocalDay(new Date(2026, 9, 20), new Date(2027, 9, 20))).toBe(
      false,
    );
  });
});
