import { describe, expectTypeOf, it } from "vitest";
import type { JourneyParameters, ValidJourneyParameters } from "./types.ts";

describe("ValidJourneyParameters", () => {
  it("is usable wherever JourneyParameters is accepted", () => {
    expectTypeOf<ValidJourneyParameters>().toExtend<JourneyParameters>();
  });

  it("cannot be satisfied by plain JourneyParameters", () => {
    expectTypeOf<JourneyParameters>().not.toExtend<ValidJourneyParameters>();
  });
});
