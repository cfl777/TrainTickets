import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatDate,
  formatDuration,
  formatPrice,
  formatTime,
} from "../format.ts";

const nl = ["nl-NL"];
const us = ["en-US"];
const de = ["de-DE"];

/** Intl uses non-breaking spaces; compare what the eye sees. */
function visible(text: string): string {
  return text.replace(/[\u00a0\u202f]/g, " ");
}

describe("formatTime", () => {
  const nineOhFive = new Date(2026, 9, 21, 9, 5);

  it("uses the locale's short time style", () => {
    expect(visible(formatTime(nineOhFive, nl))).toBe("09:05");
    expect(visible(formatTime(nineOhFive, us))).toBe("9:05 AM");
  });

  it("reuses one formatter per locale", () => {
    const spy = vi.spyOn(Intl, "DateTimeFormat");
    formatTime(nineOhFive, ["fr-FR"]);
    formatTime(nineOhFive, ["fr-FR"]);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

describe("formatDate", () => {
  const wednesday = new Date(2026, 9, 21);

  it("writes the full date in the locale's order and language", () => {
    expect(visible(formatDate(wednesday, nl))).toBe("woensdag 21 oktober 2026");
    expect(visible(formatDate(wednesday, us))).toBe(
      "Wednesday, October 21, 2026",
    );
  });

  it("reuses one formatter per locale", () => {
    const spy = vi.spyOn(Intl, "DateTimeFormat");
    formatDate(wednesday, ["fr-FR"]);
    formatDate(wednesday, ["fr-FR"]);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

describe("formatPrice", () => {
  const fifteen = { value: 15, currency: "EUR" };

  it("places the symbol and separators per locale, same data", () => {
    expect(visible(formatPrice(fifteen, nl))).toBe("€ 15,00");
    expect(visible(formatPrice(fifteen, us))).toBe("€15.00");
    expect(visible(formatPrice(fifteen, de))).toBe("15,00 €");
  });

  it("reuses one formatter per locale and currency", () => {
    const spy = vi.spyOn(Intl, "NumberFormat");
    formatPrice(fifteen, ["fr-FR"]);
    formatPrice(fifteen, ["fr-FR"]);
    formatPrice({ value: 1, currency: "USD" }, ["fr-FR"]);
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it("takes the currency from the amount, not from the locale", () => {
    expect(visible(formatPrice({ value: 22.5, currency: "GBP" }, us))).toBe(
      "£22.50",
    );
  });
});

describe("formatDuration", () => {
  it("formats hours and minutes with Intl.DurationFormat", () => {
    expect(visible(formatDuration({ hours: 2, minutes: 30 }, us))).toBe(
      "2 hr, 30 min",
    );
    expect(visible(formatDuration({ hours: 2, minutes: 30 }, nl))).toBe(
      "2 uur, 30 min",
    );
  });

  it("omits the hours when there are none", () => {
    expect(visible(formatDuration({ hours: 0, minutes: 10 }, us))).toBe(
      "10 min",
    );
  });

  describe("without Intl.DurationFormat", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("falls back to NumberFormat hour and minute units", () => {
      const intlWithout = Object.create(Intl) as typeof Intl;
      Object.defineProperty(intlWithout, "DurationFormat", {
        value: undefined,
      });
      vi.stubGlobal("Intl", intlWithout);

      // A locale not used above, so the cache cannot serve a real formatter.
      expect(
        visible(formatDuration({ hours: 2, minutes: 30 }, ["en-GB"])),
      ).toBe("2 hrs 30 mins");
      expect(
        visible(formatDuration({ hours: 0, minutes: 10 }, ["en-GB"])),
      ).toBe("10 mins");
    });
  });
});
