import { describe, expect, it } from "vitest";
import { parseSearchParams, toSearchParams } from "../searchParams.ts";
import { validateJourneyParameters } from "../validation.ts";

const now = new Date(2026, 9, 20, 15, 30);

function validated(raw: Parameters<typeof validateJourneyParameters>[0]) {
  const result = validateJourneyParameters(raw, now);
  if (!result.ok) {
    throw new Error(`Expected valid input: ${JSON.stringify(result.errors)}`);
  }
  return result.value;
}

describe("parseSearchParams", () => {
  it.each(["", "?"])("returns null for %j (idle)", (search) => {
    expect(parseSearchParams(search)).toBeNull();
  });

  it("reads the four known keys, with or without a leading ?", () => {
    const expected = {
      origin: "Enschede",
      destination: "Hengelo",
      date: "2026-10-21",
      passengers: "2",
    };
    const query =
      "origin=Enschede&destination=Hengelo&date=2026-10-21&passengers=2";
    expect(parseSearchParams(query)).toEqual(expected);
    expect(parseSearchParams(`?${query}`)).toEqual(expected);
  });

  it("ignores key order", () => {
    expect(
      parseSearchParams(
        "passengers=2&date=2026-10-21&destination=Hengelo&origin=Enschede",
      ),
    ).toEqual({
      origin: "Enschede",
      destination: "Hengelo",
      date: "2026-10-21",
      passengers: "2",
    });
  });

  it("returns null for a missing key and ignores unknown keys", () => {
    expect(parseSearchParams("origin=Enschede&utm_source=mail")).toEqual({
      origin: "Enschede",
      destination: null,
      date: null,
      passengers: null,
    });
  });

  it("takes the first value of a repeated key", () => {
    expect(parseSearchParams("origin=Enschede&origin=Almelo")?.origin).toBe(
      "Enschede",
    );
  });

  it("decodes percent-encoding and plus signs into plain text", () => {
    const raw = parseSearchParams("origin=Den+Haag&destination=%3Cscript%3E");
    expect(raw?.origin).toBe("Den Haag");
    expect(raw?.destination).toBe("<script>");
  });

  it("does not treat __proto__ as a known key", () => {
    const raw = parseSearchParams("__proto__=polluted&origin=Enschede");
    expect(raw).toEqual({
      origin: "Enschede",
      destination: null,
      date: null,
      passengers: null,
    });
    expect(Object.getPrototypeOf(raw)).toBe(Object.prototype);
  });
});

describe("toSearchParams", () => {
  it("writes the four keys in contract order with encoding", () => {
    const value = validated({
      origin: "Den Haag",
      destination: "Hengelo & Borne",
      date: "2026-10-21",
      passengers: "3",
    });
    expect(toSearchParams(value)).toBe(
      "origin=Den+Haag&destination=Hengelo+%26+Borne&date=2026-10-21&passengers=3",
    );
  });

  it.each([
    "2026-10-21",
    "2026-10-25",
    "2026-11-01",
    "2027-03-14",
    "2027-03-28",
  ])("round-trips a search dated %s in the current time zone", (date) => {
    const original = validated({
      origin: "Enschede",
      destination: "Hengelo",
      date,
      passengers: "2",
    });
    const raw = parseSearchParams(toSearchParams(original));
    expect(raw).not.toBeNull();
    if (raw === null) return;
    const again = validated(raw);
    expect(again).toEqual(original);
    expect(again.date.getTime()).toBe(original.date.getTime());
  });
});
