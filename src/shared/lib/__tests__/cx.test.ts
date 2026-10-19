import { describe, expect, it } from "vitest";
import { cx } from "../cx.ts";

describe("cx", () => {
  it("joins the given names with a space", () => {
    expect(cx("field", "hasError")).toBe("field hasError");
  });

  it("drops undefined names", () => {
    expect(cx("field", undefined, "hasError")).toBe("field hasError");
    expect(cx(undefined)).toBe("");
  });

  it("returns an empty string for no names", () => {
    expect(cx()).toBe("");
  });
});
