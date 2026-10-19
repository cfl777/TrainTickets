# Train Journeys

A single-page React application for searching train journeys. The user enters an origin, a destination, a travel date and a number of passengers; the page writes that search to the URL, calls a mock `searchJourneys` API, and shows the matching journeys with departure and arrival times, duration and price formatted for the browser's locale. Built as a frontend programming assignment, where architectural choices count for more than feature count.

## Quick start

```bash
pnpm install
pnpm dev
pnpm test
```

Everything else, including how to reach each state of the page, is in [run.md](docs/run.md).

## Documents

| File                                    | What it holds                                                                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [run.md](docs/run.md)                   | Prerequisites, every script, how to see each state, troubleshooting                                                                                           |
| [architecture.md](docs/architecture.md) | Layers, URL contract, data flow, mock API, validation, fetching, formatting, components, accessibility, security, performance, testing, tooling, dependencies |
| [assumptions.md](docs/assumptions.md)   | Every place the brief was ambiguous, and what was decided                                                                                                     |
| [decisions.md](docs/decisions.md)       | The architecture decision log: options considered and why each was chosen or declined                                                                         |

## How to review this repository

Read the code in this order. Each file is small and the next one builds on it.

1. `src/features/journey-search/model/types.ts` — the contract from the brief, verbatim, plus the branded `ValidJourneyParameters` type.
2. `src/features/journey-search/model/validation.ts` — the one validator shared by the form and the URL.
3. `src/features/journey-search/model/searchParams.ts` and `src/shared/lib/localDate.ts` — the URL codec and the calendar-day boundary.
4. `src/features/journey-search/api/` — the timetable, the fixture builder and `searchJourneys` with its factory.
5. `src/features/journey-search/model/useJourneySearch.ts` — parse, validate, query, build rows; returns one discriminated union.
6. `src/features/journey-search/ui/SearchPage.tsx` — composition only.
7. `src/features/journey-search/api/stations.ts` and `src/features/journey-search/ui/StationField.tsx` — the station lookup: prefix matching in the mock, a lazily loaded React Aria combobox in the form.

Tests sit in a `__tests__` folder beside the files they cover. The pure modules in `model`, `api` and `shared/lib` have 100 % coverage thresholds.

## Try it without installing

Hosted preview: https://train-journeys.vercel.app. Only `main` is deployed; at the time of writing the site reflects commit `1a66b5e`. Added for quick initial checks without starting the project; the local route above stays the reference.

## Build numbers

Measured on 18 October 2026 at commit `1a66b5e`: the size from `pnpm build`, the scores from Lighthouse 12.8 against the hosted preview (mobile and desktop presets).

| Measure                     | Budget       | Measured                |
| --------------------------- | ------------ | ----------------------- |
| Initial JavaScript, gzipped | under 100 KB | 84.31 kB                |
| Station lookup chunk        | under 70 KB  | 59.99 kB, on demand     |
| Lighthouse performance      | 95 or above  | 100 mobile, 100 desktop |
| Lighthouse accessibility    | 100          | 100 mobile, 100 desktop |

## Dependencies

Four runtime dependencies: `react`, `react-dom`, `@tanstack/react-query` and `react-aria-components` (the station combobox, loaded on demand). Everything else is development-only. Each package and its one-sentence motivation is listed in [architecture.md](docs/architecture.md#dependencies).

## Continuous integration

[![CI](https://github.com/cfl777/TrainTickets/actions/workflows/ci.yml/badge.svg)](https://github.com/cfl777/TrainTickets/actions/workflows/ci.yml) The workflow runs lint, format check, typecheck, knip, unit tests in two time zones, the build with its size check, and the Playwright suite in a second job.
