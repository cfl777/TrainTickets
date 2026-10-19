import { describe, expect, it } from "vitest";
import { isSameSearch } from "../sameSearch.ts";
import type { RawJourneyParameters } from "../validation.ts";

// A Tuesday afternoon; "today" is 2026-10-20 in the test's time zone.
const now = new Date(2026, 9, 20, 15, 30);

const searched: RawJourneyParameters = {
  origin: "Enschede",
  destination: "Hengelo",
  date: "2026-10-21",
  passengers: "2",
};

describe("isSameSearch", () => {
  it("is true for the searched values themselves", () => {
    expect(isSameSearch(searched, searched, now)).toBe(true);
  });

  it("folds spaces, case and accents like the validator does", () => {
    expect(
      isSameSearch(
        { ...searched, origin: " enschedé ", passengers: " 2 " },
        searched,
        now,
      ),
    ).toBe(true);
  });

  it.each([
    ["destination", { destination: "Almelo" }],
    ["origin", { origin: "Hengelo", destination: "Enschede" }],
    ["date", { date: "2026-10-22" }],
    ["passengers", { passengers: "3" }],
  ])("is false when the %s differs", (_field, change) => {
    expect(isSameSearch({ ...searched, ...change }, searched, now)).toBe(false);
  });

  it("is false while either side is invalid", () => {
    const empty = { ...searched, destination: "" };
    expect(isSameSearch(empty, searched, now)).toBe(false);
    expect(isSameSearch(searched, empty, now)).toBe(false);
  });
});
