/**
 * Locale-aware formatting with Intl only (decision 08). Goals:
 *
 * - Locales are an explicit argument: components pass navigator.languages,
 *   tests pass a fixed list. Nothing here reads a global.
 * - One formatter per locale (and per currency for prices), created on
 *   first use and cached; construction is the expensive part.
 * - Duration through Intl.DurationFormat, with a feature-detected fallback
 *   to NumberFormat hour and minute units.
 * - Currency and amount come from the data; this file never converts.
 */

export type Locales = readonly string[];

function cacheKey(locales: Locales, extra = ""): string {
  return `${locales.join(",")}|${extra}`;
}

const timeFormatters = new Map<string, Intl.DateTimeFormat>();

/** Hours and minutes in the locale's short time style, e.g. 09:05 or 9:05 AM. */
export function formatTime(date: Date, locales: Locales): string {
  const key = cacheKey(locales);
  let formatter = timeFormatters.get(key);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat(locales, { timeStyle: "short" });
    timeFormatters.set(key, formatter);
  }
  return formatter.format(date);
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

/** The full calendar date in the locale, e.g. woensdag 21 oktober 2026. */
export function formatDate(date: Date, locales: Locales): string {
  const key = cacheKey(locales);
  let formatter = dateFormatters.get(key);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat(locales, { dateStyle: "full" });
    dateFormatters.set(key, formatter);
  }
  return formatter.format(date);
}

const priceFormatters = new Map<string, Intl.NumberFormat>();

/** The amount as currency in the locale's style, e.g. € 15,00 or €15.00. */
export function formatPrice(
  amount: { readonly value: number; readonly currency: string },
  locales: Locales,
): string {
  const key = cacheKey(locales, amount.currency);
  let formatter = priceFormatters.get(key);
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat(locales, {
      style: "currency",
      currency: amount.currency,
    });
    priceFormatters.set(key, formatter);
  }
  return formatter.format(amount.value);
}

type DurationParts = { hours: number; minutes: number };
type DurationFormatter = (parts: DurationParts) => string;

const durationFormatters = new Map<string, DurationFormatter>();

function createDurationFormatter(locales: Locales): DurationFormatter {
  // Typed as optional on purpose: the ES2025 lib declares it present, but
  // older browsers do not have it.
  const DurationFormat = (Intl as Partial<typeof Intl>).DurationFormat;

  if (DurationFormat !== undefined) {
    const formatter = new DurationFormat(locales, { style: "short" });
    return ({ hours, minutes }) =>
      formatter.format(hours === 0 ? { minutes } : { hours, minutes });
  }

  const hourUnit = new Intl.NumberFormat(locales, {
    style: "unit",
    unit: "hour",
    unitDisplay: "short",
  });
  const minuteUnit = new Intl.NumberFormat(locales, {
    style: "unit",
    unit: "minute",
    unitDisplay: "short",
  });
  return ({ hours, minutes }) =>
    hours === 0
      ? minuteUnit.format(minutes)
      : `${hourUnit.format(hours)} ${minuteUnit.format(minutes)}`;
}

/** A duration in hours and minutes, e.g. 2 hr, 30 min or 2 uur, 30 min. */
export function formatDuration(parts: DurationParts, locales: Locales): string {
  const key = cacheKey(locales);
  let formatter = durationFormatters.get(key);
  if (formatter === undefined) {
    formatter = createDurationFormatter(locales);
    durationFormatters.set(key, formatter);
  }
  return formatter(parts);
}
