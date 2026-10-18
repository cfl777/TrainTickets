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

Tests sit in a `__tests__` folder beside the files they cover. The pure modules in `model`, `api` and `shared/lib` have 100 % coverage thresholds.

## Try it without installing

Hosted preview: _to be added after the first deploy_.

## Build numbers

Measured on _date to be filled in_ with `pnpm build` and Lighthouse (mobile and desktop presets).

| Measure                     | Budget       | Measured |
| --------------------------- | ------------ | -------- |
| Initial JavaScript, gzipped | under 100 KB | _tbd_    |
| Lighthouse performance      | 95 or above  | _tbd_    |
| Lighthouse accessibility    | 100          | _tbd_    |

## Dependencies

Three runtime dependencies: `react`, `react-dom` and `@tanstack/react-query`. Everything else is development-only. Each package and its one-sentence motivation is listed in [architecture.md](docs/architecture.md#dependencies).

## Continuous integration

[![CI](https://github.com/cfl777/TrainTickets/actions/workflows/ci.yml/badge.svg)](https://github.com/cfl777/TrainTickets/actions/workflows/ci.yml) The workflow runs lint, format check, typecheck, knip, unit tests in two time zones, the build with its size check, and the Playwright suite in a second job.
