# Assumptions

The brief asks for assumptions to be noted where it is unclear. Each entry below has the same shape: what the brief says, where it is ambiguous, what was decided, and what follows from that. Decisions that are not readings of an ambiguity, such as how duration is derived or how the mock is structured, are in [architecture.md](architecture.md) instead.

## 1. The example journeys are dated April 2025

**The brief says** the response should be based on the dataset in the brief, and that the travel date cannot be in the past. All eight rows are dated 20 or 21 April 2025.

**The ambiguity:** taken literally, no valid search can ever return a result.

**Decided:** the eight rows are read as a daily timetable. The mock serves each of them for every day from tomorrow through the Friday of next week, computed against the current date when the API is called, so the data never goes stale. Routes, times and per-passenger prices are exactly the brief's.

**Consequence:** every date in the review week has results. A search for today returns "no journeys found", which is the honest empty state rather than a bug. The original dates are kept in the timetable file as `sourceDate` so each row can be traced back to the brief.

## 2. Price is per passenger in the data, single in the contract

**The brief says** the dataset column is "price per passenger", while the `Journey` type has one `price` and the API receives `nrOfPassengers`.

**The ambiguity:** for three passengers at €6.00 each, does the table show €6.00 or €18.00?

**Decided:** the API returns the total for the requested number of passengers. Pricing stays behind the API; the UI only formats. Multiplication happens in whole cents so 3 × €5.00 is exactly €15.00.

**Consequence:** the price column is headed "Total for N passengers". The contract's `Journey` type is not extended.

## 3. How a typed station name matches

**The brief says** origin and destination are strings.

**The ambiguity:** whether "enschede ", "Ensch" or "Enschedé" should find Enschede.

**Decided:** exact match after normalisation. Names are trimmed and compared with `Intl.Collator` at base sensitivity, so case and accents are ignored. Partial names do not match. The search itself treats an unknown or partial name as an ordinary empty result, but the page never sends one: the validator rejects any name that is not in the station list, with the same comparison (decision 25).

**Consequence:** search is deterministic and never guesses. Suggestions for partial names belong in a separate station-lookup step, as in production rail systems; that step is the station lookup (decision 23), not part of the search.

## 4. What "travel date" means

**The brief says** the date is a `Date` in the contract and must not be in the past.

**The ambiguity:** a JavaScript `Date` is an instant, not a calendar day, and the same instant is a different day in different time zones.

**Decided:** a travel date is a calendar day in the user's local time zone. The URL carries it as `yyyy-mm-dd`. Conversion between that string and a `Date` happens by local parts in one module, never through `toISOString()` or `new Date(string)`. Journeys match on the local calendar day of their departure. Today is a valid travel date.

**Consequence:** the tests run under Europe/Amsterdam and America/New_York so both directions of the conversion are proven in a positive and a negative offset.

## 5. What "invalid or insecure requests" means for a local mock

**The brief says** the page should not send invalid or insecure requests to the search API.

**The ambiguity:** there is no network; the API is a function.

**Decided:** the API is only ever called with parameters that passed the same validator the form uses, including parameters read from a hand-edited URL, and the type system enforces it through a branded `ValidJourneyParameters` type. The API also validates its own input. Query strings are built with `URLSearchParams`, read by known keys only, length-capped, and never rendered as raw HTML. No request is sent while typing, without a query string, or twice for the same key.

**Consequence:** a malformed URL shows the validation summary with the form pre-filled, and the API is never called. The full checklist is in [architecture.md](architecture.md#security).

## 6. Origin equal to destination

**The brief says** nothing about it.

**The ambiguity:** allow it and return nothing, or reject it.

**Decided:** reject it with a validation message on the destination field: "Destination must differ from origin". Compared after the same normalisation as station matching.

**Consequence:** one rule the brief did not state, chosen for the traveller's benefit and tested like every other rule.

## 7. Default date

**The brief says** the date field is required.

**The ambiguity:** whether to pre-fill it, and with what.

**Decided:** the date defaults to tomorrow, because the data starts tomorrow (assumption 1). Passengers defaults to 1.

**Consequence:** the first search a reviewer makes returns results. A production application would default to today.

## 8. The timetable has no station time zone

**The brief says** departure and arrival times, with no zone.

**The ambiguity:** 09:00 in Enschede is 03:00 in New York.

**Decided:** the mock builds a 09:00 departure as 09:00 in the browser's local zone. This is a deliberate simplification of test data.

**Consequence:** a reviewer in another time zone sees the brief's times as local times. The production fix is to store times as Europe/Amsterdam and build instants in that zone; nothing in the UI would change, since it formats instants.
