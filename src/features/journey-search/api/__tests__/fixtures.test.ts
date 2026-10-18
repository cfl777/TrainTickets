import { describe, expect, it } from "vitest";
import { buildJourneys } from "../fixtures.ts";
import { timetable } from "../timetable.ts";

const tuesday = new Date(2026, 9, 20, 15, 30);

describe("buildJourneys", () => {
  it("serves every service on each of the next eight days", () => {
    const journeys = buildJourneys(timetable, tuesday);
    expect(journeys).toHaveLength(8 * 8);
    const days = new Set(journeys.map((j) => j.departure.getDate()));
    expect([...days]).toEqual([21, 22, 23, 24, 25, 26, 27, 28]);
  });

  it("starts tomorrow and never today", () => {
    const journeys = buildJourneys(timetable, tuesday);
    expect(journeys.every((j) => j.departure > tuesday)).toBe(true);
    expect(journeys.some((j) => j.departure.getDate() === 20)).toBe(false);
  });

  it("keeps the timetable's local times on every day", () => {
    const journeys = buildJourneys(timetable, tuesday);
    for (const [index, journey] of journeys.entries()) {
      const entry = timetable[index % timetable.length];
      if (entry === undefined) throw new Error("unexpected index");
      const [hours, minutes] = entry.departure.split(":").map(Number);
      expect(journey.departure.getHours()).toBe(hours);
      expect(journey.departure.getMinutes()).toBe(minutes);
      expect(journey.arrival > journey.departure).toBe(true);
    }
  });

  it("does not depend on the time of day of now", () => {
    const early = buildJourneys(timetable, new Date(2026, 9, 20, 0, 1));
    const late = buildJourneys(timetable, new Date(2026, 9, 20, 23, 59));
    expect(late.map((j) => j.departure.getTime())).toEqual(
      early.map((j) => j.departure.getTime()),
    );
  });

  it("rolls over month ends", () => {
    const journeys = buildJourneys(timetable, new Date(2026, 9, 28));
    const days = journeys.map((j) => j.departure.getDate());
    expect(days.slice(0, 8).every((d) => d === 29)).toBe(true);
    expect(days.slice(-8).every((d) => d === 5)).toBe(true);
    expect(journeys.at(-1)?.departure.getMonth()).toBe(10);
  });

  it("keeps 09:00 as 09:00 across the autumn clock change", () => {
    // 25 Oct 2026 is the European change; 1 Nov 2026 the American one.
    const journeys = buildJourneys(timetable, new Date(2026, 9, 23));
    const nineOClock = journeys.filter(
      (j) => j.origin === "Enschede" && j.destination === "Hengelo",
    );
    expect(
      nineOClock.every((j) => [9, 14].includes(j.departure.getHours())),
    ).toBe(true);
  });

  it("carries the per-passenger price in cents and the currency", () => {
    const [first] = buildJourneys(timetable, tuesday);
    expect(first?.unitPriceCents).toBe(600);
    expect(first?.currency).toBe("EUR");
  });

  it("defaults to the real timetable and the current date", () => {
    expect(buildJourneys()).toHaveLength(64);
  });
});
