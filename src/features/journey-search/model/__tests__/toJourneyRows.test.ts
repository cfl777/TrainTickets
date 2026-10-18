import { describe, expect, it } from "vitest";
import { toJourneyRows } from "../toJourneyRows.ts";
import type { Journey } from "../types.ts";

const nl = ["nl-NL"];
const us = ["en-US"];

function visible(text: string): string {
  return text.replace(/[\u00a0\u202f]/g, " ");
}

const nineToNineTen: Journey = {
  departure: new Date(2026, 9, 21, 9, 0),
  arrival: new Date(2026, 9, 21, 9, 10),
  price: { value: 12, currency: "EUR" },
};

const fiveToSevenThirty: Journey = {
  departure: new Date(2026, 9, 21, 17, 0),
  arrival: new Date(2026, 9, 21, 19, 30),
  price: { value: 15, currency: "EUR" },
};

describe("toJourneyRows", () => {
  it("returns an empty list for no journeys", () => {
    expect(toJourneyRows([], nl)).toEqual([]);
  });

  it("formats every cell for the locale", () => {
    const [row] = toJourneyRows([fiveToSevenThirty], nl);
    expect(row).toBeDefined();
    expect(visible(row?.departure.text ?? "")).toBe("17:00");
    expect(visible(row?.arrival.text ?? "")).toBe("19:30");
    expect(visible(row?.duration.text ?? "")).toBe("2 uur, 30 min");
    expect(visible(row?.price ?? "")).toBe("€ 15,00");
  });

  it("changes presentation only when the locale changes", () => {
    const [row] = toJourneyRows([fiveToSevenThirty], us);
    expect(visible(row?.departure.text ?? "")).toBe("5:00 PM");
    expect(visible(row?.duration.text ?? "")).toBe("2 hr, 30 min");
    expect(visible(row?.price ?? "")).toBe("€15.00");
  });

  it("gives each time value a machine-readable twin", () => {
    const [row] = toJourneyRows([nineToNineTen], us);
    expect(row?.departure.dateTime).toBe(nineToNineTen.departure.toISOString());
    expect(row?.arrival.dateTime).toBe(nineToNineTen.arrival.toISOString());
    expect(row?.duration.dateTime).toBe("PT10M");
  });

  it("keeps the API's order", () => {
    const rows = toJourneyRows([fiveToSevenThirty, nineToNineTen], us);
    expect(rows.map((r) => visible(r.departure.text))).toEqual([
      "5:00 PM",
      "9:00 AM",
    ]);
  });

  it("gives identical journeys distinct ids", () => {
    const rows = toJourneyRows([nineToNineTen, nineToNineTen], us);
    expect(rows[0]?.id).not.toBe(rows[1]?.id);
    expect(new Set(rows.map((r) => r.id)).size).toBe(2);
  });
});
