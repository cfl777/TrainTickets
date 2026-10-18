import { describe, expect, it } from "vitest";
import { isSameText } from "./text.ts";

describe("isSameText", () => {
  it.each([
    ["Enschede", "Enschede"],
    ["Enschede", "enschede"],
    ["Enschede", "ENSCHEDE"],
    ["Enschede", " Enschede "],
    ["Enschede", "Enschedé"],
    ["Almelo", "almelo\t"],
  ])("treats %j and %j as the same", (a, b) => {
    expect(isSameText(a, b)).toBe(true);
  });

  it.each([
    ["Enschede", "Hengelo"],
    ["Enschede", "Ensch"],
    ["Enschede", "Enschede Centraal"],
    ["Enschede", ""],
  ])("treats %j and %j as different", (a, b) => {
    expect(isSameText(a, b)).toBe(false);
  });
});
