import { describe, expect, it } from "vitest";
import { validationMessages } from "../strings.ts";
import { validateJourneyParameters } from "../validation.ts";

type Raw = Parameters<typeof validateJourneyParameters>[0];

// A Tuesday afternoon; "today" is 2026-10-20 in the test's time zone.
const now = new Date(2026, 9, 20, 15, 30);

const valid: Raw = {
  origin: "Enschede",
  destination: "Hengelo",
  date: "2026-10-21",
  passengers: "2",
};

function errorsOf(overrides: Partial<Raw>) {
  const result = validateJourneyParameters({ ...valid, ...overrides }, now);
  return result.ok ? {} : result.errors;
}

describe("validateJourneyParameters", () => {
  it("returns normalised, branded parameters for valid input", () => {
    const result = validateJourneyParameters(
      { ...valid, origin: "  Enschede ", passengers: " 2 " },
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.origin).toBe("Enschede");
    expect(result.value.destination).toBe("Hengelo");
    expect(result.value.date).toEqual(new Date(2026, 9, 21));
    expect(result.value.nrOfPassengers).toBe(2);
  });

  it.each([null, "", "   "])("rejects origin %j", (origin) => {
    expect(errorsOf({ origin })).toEqual({ origin: validationMessages.origin });
  });

  it("caps station names at 100 characters before the station check", () => {
    expect(errorsOf({ origin: "a".repeat(100) })).toEqual({
      origin: validationMessages.unknownStation,
    });
    expect(errorsOf({ origin: "a".repeat(101) })).toEqual({
      origin: validationMessages.origin,
    });
  });

  it.each([null, "", "   "])("rejects destination %j", (destination) => {
    expect(errorsOf({ destination })).toEqual({
      destination: validationMessages.destination,
    });
  });

  it.each(["Zwolle", "Ensch", "Enschedee", "<script>", "error"])(
    "rejects the unknown origin %j",
    (origin) => {
      expect(errorsOf({ origin })).toEqual({
        origin: validationMessages.unknownStation,
      });
    },
  );

  it.each(["Amsterdam", "Hen"])(
    "rejects the unknown destination %j",
    (destination) => {
      expect(errorsOf({ destination })).toEqual({
        destination: validationMessages.unknownStation,
      });
    },
  );

  it.each([" almelo ", "ALMELO", "Álmelo"])(
    "accepts %j as a known station, ignoring case, accents and spaces",
    (name) => {
      expect(errorsOf({ origin: name })).toEqual({});
      expect(errorsOf({ destination: name })).toEqual({});
    },
  );

  it("reports both unknown stations, even when they are the same text", () => {
    expect(errorsOf({ origin: "Zwolle", destination: "zwolle" })).toEqual({
      origin: validationMessages.unknownStation,
      destination: validationMessages.unknownStation,
    });
  });

  it.each(["Enschede", "enschede ", "ENSCHEDE", "Enschedé"])(
    "rejects destination %j when origin is Enschede",
    (destination) => {
      expect(errorsOf({ destination })).toEqual({
        destination: validationMessages.sameStation,
      });
    },
  );

  it("does not report same station when a name is missing", () => {
    expect(errorsOf({ origin: "", destination: "" })).toEqual({
      origin: validationMessages.origin,
      destination: validationMessages.destination,
    });
  });

  it.each<[string | null, string]>([
    [null, "missing"],
    ["", "empty"],
    ["21-10-2026", "wrong shape"],
    ["2026-02-30", "impossible day"],
    ["2026-10-19", "yesterday"],
    ["2025-04-20", "the brief's date, in the past"],
  ])("rejects date %j (%s)", (date) => {
    expect(errorsOf({ date })).toEqual({ date: validationMessages.date });
  });

  it.each<[string, string]>([
    ["2026-10-20", "today, even in the afternoon"],
    ["2026-10-21", "tomorrow"],
    ["2027-01-01", "far future"],
  ])("accepts date %j (%s)", (date) => {
    expect(errorsOf({ date })).toEqual({});
  });

  it.each([null, "", "0", "11", "-1", "1.5", "2.0", "1e1", "two", "0x2"])(
    "rejects passengers %j",
    (passengers) => {
      expect(errorsOf({ passengers })).toEqual({
        passengers: validationMessages.passengers,
      });
    },
  );

  it.each(["1", "10", " 3 ", "07"])("accepts passengers %j", (passengers) => {
    expect(errorsOf({ passengers })).toEqual({});
  });

  it("reports every invalid field at once", () => {
    const result = validateJourneyParameters(
      { origin: null, destination: null, date: null, passengers: null },
      now,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual([
      "date",
      "destination",
      "origin",
      "passengers",
    ]);
  });
});
