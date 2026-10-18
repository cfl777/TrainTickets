import { describe, expect, it } from "vitest";
import { resultsCaption, resultStrings, searchTitle } from "../strings.ts";

describe("result strings", () => {
  it.each([
    [1, "1 journey found"],
    [2, "2 journeys found"],
    [10, "10 journeys found"],
  ])("counts %i as %j", (count, text) => {
    expect(resultStrings.found(count)).toBe(text);
  });

  it.each([
    [1, "Total for 1 passenger"],
    [3, "Total for 3 passengers"],
  ])("heads the price column for %i as %j", (passengers, text) => {
    expect(resultStrings.columns.price(passengers)).toBe(text);
  });

  it.each([
    [1, "Enschede to Hengelo on Monday, 1 passenger"],
    [2, "Enschede to Hengelo on Monday, 2 passengers"],
  ])("captions %i passenger(s) as %j", (passengers, text) => {
    expect(
      resultsCaption({
        origin: "Enschede",
        destination: "Hengelo",
        date: "Monday",
        passengers,
      }),
    ).toBe(text);
  });

  it("puts the search before the app name in the title", () => {
    expect(searchTitle("Enschede", "Hengelo")).toBe(
      "Enschede to Hengelo | Train journeys",
    );
  });
});
