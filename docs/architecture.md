# Architecture

How the Train Journeys application is built and why. Read top down: each section builds on the one before. Readings of ambiguous requirements are in [assumptions.md](assumptions.md); the options considered for each choice are in [decisions.md](decisions.md).

## Overview

One page. The URL query string is the only state. Submitting the form does not search; it writes the URL. The page reacts to the URL, so a direct open, a form submit, and the Back button all take the same path.

```
form submit ──► validate ──► setSearch(params) ──► history.pushState + event
                   │ invalid                                   │
                   ▼                                           ▼
            error summary                      useSearchParams re-renders SearchPage
            (API not called)                                   │
                                                               ▼
                                           parseSearchParams ──► validate ──► useJourneySearch
                                                                     │ invalid         │ enabled
                                                                     ▼                 ▼
                                                              error summary        loading → results / no results / error

direct open or Back/Forward ──► popstate ──► same path from "useSearchParams re-renders"
```

Five visible states: idle (no query string), loading, results, no results, error. A sixth, invalid, shows the validation summary with the form pre-filled from the URL and never calls the API.

## URL contract

```
/?origin=Enschede&destination=Hengelo&date=2026-10-20&passengers=2
```

| Key           | Value        | Rule                                                       |
| ------------- | ------------ | ---------------------------------------------------------- |
| `origin`      | string       | required, non-empty after trimming, at most 100 characters |
| `destination` | string       | same; must differ from origin after normalisation          |
| `date`        | `yyyy-mm-dd` | required; a local calendar day; today or later             |
| `passengers`  | integer      | required; 1 to 10                                          |

Parsing rules: key order is irrelevant; unknown keys are ignored; a duplicate key takes its first value; a missing or malformed key is a validation error; no query string at all is the idle state. The form's inputs carry these exact names, so `FormData` maps to the URL one to one. The URL is always written with `URLSearchParams`, never by string concatenation.

| Address                                                      | Page state                                  |
| ------------------------------------------------------------ | ------------------------------------------- |
| `/`                                                          | Idle                                        |
| `/?origin=Enschede&destination=Hengelo&date=…&passengers=2`  | Loading, then results                       |
| `/?passengers=2&date=…&destination=Hengelo&origin=Enschede`  | Same; order irrelevant                      |
| `/?origin=enschede+&destination=HENGELO&date=…&passengers=1` | Results; trim and case folded               |
| `/?…&utm_source=mail`                                        | Results; unknown key ignored                |
| `/?origin=Ensch&…`                                           | No results; partial names do not match      |
| `/?origin=Enschede&destination=Amsterdam&…`                  | No results; unknown station is not an error |
| `/?…&date=2025-04-20&…`                                      | Validation error: past date; API not called |
| `/?…&date=20-10-2026&…`                                      | Validation error: date format               |
| `/?…&passengers=11`                                          | Validation error: out of range              |
| `/?origin=Enschede&destination=Hengelo&date=…`               | Validation error: passengers missing        |
| `/?origin=Enschede&origin=Almelo&…`                          | Results from Enschede; first value wins     |
| `/?origin=error&…`                                           | Error state with retry                      |
| `/?origin=%3Cscript%3E…`                                     | No results; rendered as text only           |

Note: in a client-rendered Vite application there is no form without JavaScript, so the matching input names are a simpler codec, not a no-JavaScript fallback.

## Layers and folder structure

Feature-sliced. There is one feature today; the structure groups everything about journey search in one place and is ready for a second feature.

```
src/
  main.tsx                          mount; StrictMode in development
  app/
    App.tsx
    providers.tsx                   QueryClientProvider, ApiProvider
  features/
    journey-search/
      api/                          the mock; no React
        timetable.ts                8 services: origin, destination, sourceDate, times, unitPriceCents
        fixtures.ts                 buildJourneys(timetable, now) → Journey[] for days +1..+8
        searchJourneys.ts           the given signature; filterJourneys + createSearchJourneys
        *.test.ts
      model/                        pure rules + the one React Query hook
        types.ts                    the brief's types verbatim; ValidJourneyParameters (branded)
        validation.ts               validateJourneyParameters(raw, now) → Result
        searchParams.ts             parseSearchParams / toSearchParams
        localDate.ts                parseLocalDate / formatLocalDate / isSameLocalDay
        duration.ts                 journeyDuration(journey) → minutes
        money.ts                    multiplyAmount in whole cents
        toJourneyRows.ts            view model: Journey → formatted row with id
        strings.ts                  all UI copy
        useJourneySearch.ts         parse → validate → useQuery → rows; returns a union
        *.test.ts(x)
      ui/                           presentational components + the page
        SearchPage.tsx              composition only
        SearchForm.tsx (+ .module.css)
        ErrorSummary.tsx
        SearchResults.tsx
        StatusMessage.tsx (+ .module.css)
        ErrorMessage.tsx
        JourneyTable.tsx (+ .module.css)
        *.test.tsx
      index.ts                      public surface: export { SearchPage }
  shared/
    lib/
      format.ts                     formatTime, formatDuration, formatPrice (locales param)
    hooks/
      useSearchParams.ts            URL ↔ state: pushState, popstate
    ui/
      Field.tsx                     label + control + hint + error wiring
      ErrorBoundary.tsx
    styles/
      tokens.css                    custom properties: colour, spacing, breakpoints
      global.css                    reset, base typography
```

Import rules, enforced with `no-restricted-imports` overrides in the ESLint config:

- Inside the feature the arrow is one way: `ui → model → api`.
- `api` and the pure files in `model` never import React.
- `shared` never imports from `features`.
- `app` imports a feature only through its `index.ts`.
- UI components contain no business rule: no date comparison, no multiplication, no filtering.

The given `SearchJourneys`, `JourneyParameters`, `Journeys`, `Journey` and `Amount` types live in `model/types.ts` exactly as handed over. Everything is `readonly`; the timetable is `as const`.

## Mock API and test data

`searchJourneys` has the brief's exact signature and is the default instance produced by `createSearchJourneys({ delayMs, now })`. The factory exists so tests can build an instance with no delay and a fixed clock, and so the same `now` serves both the test data and the "today is valid" validation rule.

- `timetable.ts` holds one row per service, in the brief's order, with `sourceDate` kept for traceability and prices in whole cents.
- `buildJourneys(timetable, now)` creates a `Journey` for each service on each day from tomorrow (+1) to the Friday of next week (+8), with local `Date` instants from the day and time parts. It runs at call time, so a tab left open past midnight still shifts correctly.
- `filterJourneys(journeys, parameters)` is pure and synchronous: origin and destination compared with `Intl.Collator` at base sensitivity after trimming; date compared on the local calendar day of departure; price is `unitPriceCents × nrOfPassengers`, divided by 100 once; sorted by departure ascending; returned frozen to honour `ReadonlyArray`.
- The async wrapper adds the delay (about 500 ms by default) and two typed errors: `InvalidParametersError` when the API's own check fails, and `SearchError` when the origin is `error`. The UI shows both as the error state; tests tell them apart.

Prefix and fuzzy matching are deliberately absent. In production rail systems a typed name is resolved to a station in a separate lookup step and the journey search is exact. A `suggestStations` lookup with an accessible combobox is a gated stretch item.

The timetable carries no station time zone; a 09:00 departure is built in the browser's zone. See assumption 8.

## Form and validation

One validator, `validateJourneyParameters(raw, now)`, turns a record of raw strings into either a `ValidJourneyParameters` or a map of field to message. The form action and the URL parser both call it. `ValidJourneyParameters` is a branded type that only the validator can construct; `createSearchJourneys`'s wrapper and the query hook accept only that type, so the compiler proves the API cannot be called with unvalidated input.

| Rule                                                                  | Message                             |
| --------------------------------------------------------------------- | ----------------------------------- |
| Origin non-empty after trimming, at most 100 characters               | Enter an origin                     |
| Destination non-empty, at most 100 characters                         | Enter a destination                 |
| Destination differs from origin after normalisation                   | Destination must differ from origin |
| Date is `yyyy-mm-dd`, today or later, compared as local calendar days | Choose a date from today onwards    |
| Passengers is an integer from 1 to 10                                 | Choose between 1 and 10 passengers  |

The form:

- `<form action={fn}>` with `useActionState`. The action validates and either returns the errors as state or calls `onSearch` with the valid parameters. The form is keyed on the URL search string so React's reset after a successful action lands on fresh defaults from the URL; this also pre-fills a shared link.
- Uncontrolled inputs, read from `FormData` in the action. Typing never re-renders the page.
- `noValidate` on the form. Native `required`, `min` and `max` stay for semantics and mobile keyboards, but browser bubbles are off so the summary below is the only feedback.
- The submit button is always enabled. "Can only be submitted if valid" is met by preventing submission, not by disabling the control, which would hide the reason from keyboard and screen-reader users.
- Passengers: `<input type="number" min="1" max="10" step="1" inputmode="numeric">`, the native `spinbutton` that rail sites' plus/minus steppers reimplement. Defaults to 1.
- Date: `<input type="date" min={today}>`. Defaults to tomorrow (assumption 7).
- Station fields: `autocapitalize="words"`, `spellcheck="false"`; the last field has `enterkeyhint="search"`.

Validation feedback, following the GOV.UK and NL Design System form patterns:

- On submit, all fields are checked at once. If any fail, an error summary renders at the top with `role="alert"`, a heading and one link per error that focuses its field; focus moves to the summary; each message also appears inline under its field with `aria-describedby` and `aria-invalid="true"`.
- After the first failed submit, each errored field re-validates on change and clears its own message once valid. Before the first submit nothing nags.
- No success ticks on valid fields. Success is the search starting.
- When the page loads with an invalid URL, the same summary shows with the form pre-filled; action-state errors take precedence over URL errors when both exist.

## Data fetching

TanStack Query v5 behind one hook, `useJourneySearch(search: string)`, which parses the URL, validates, runs the query and builds rows, returning a discriminated union: `idle`, `invalid { errors }`, `loading`, `success { rows, caption, count }`, `error { message, retry }`. Components never import the library directly.

Why a library for one call: results are keyed by the query key, so a response for a key no longer rendered is never shown and the stale-response race is removed structurally; the cache is keyed by the parsed URL parameters, so Back shows the previous table instantly; `enabled` tied to validation means the query does not exist until validation passed. A hand-written reducer is fully defensible for one call; the library is the standard tool for server state and the configuration below is where the judgement shows. React 19's `use()` is not a data-fetching solution on its own and is not used.

| Option                                       | Value                                                     | Why                                                                                                                    |
| -------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `retry`                                      | `0`                                                       | The mock fails deterministically; a retry only delays the error state. Production would use one to three with backoff. |
| `refetchOnWindowFocus`, `refetchOnReconnect` | `false`                                                   | A search re-running when the user returns to the tab is surprising.                                                    |
| `staleTime`                                  | 5 minutes                                                 | Back navigation shows the cached table with no refetch; results are not live data.                                     |
| `queryKey`                                   | `['journeys', { origin, destination, date, passengers }]` | From validated, normalised parameters; `date` as the string so equal searches hash identically.                        |
| `enabled`                                    | `params !== null`                                         | No query until validation passed.                                                                                      |
| Devtools                                     | development only                                          | Lazy import behind `import.meta.env.DEV`; absent from the build.                                                       |

The five states:

| State      | Condition                             | Presentation                                                                                                                                                                         |
| ---------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Idle       | no query string                       | Form only; status region empty                                                                                                                                                       |
| Loading    | `isPending`, no data yet for this key | Status region "Searching for journeys"; decorative spinner hidden from assistive tech; results area keeps a reserved height; a cached search returning from history never shows this |
| Results    | success, rows > 0                     | Table with a caption stating the search; status region announces "N journeys found"                                                                                                  |
| No results | success, rows = 0                     | Status region "No journeys found for this search"; form stays filled                                                                                                                 |
| Error      | error                                 | Alert region with the message and a "Try again" button calling `refetch`; focus moves to it                                                                                          |

A new key clears the old table. Rail sites replace results on a new search and keep them only when refining the same result set, which this page does not do, so `keepPreviousData` is not used. On narrow screens the results region is scrolled into view after submit, respecting `prefers-reduced-motion`. Optimistic updates do not apply: they are a mutation technique and a search is a read.

## Formatting and locale

`Intl` only. `navigator.languages` is passed explicitly into formatters, which are created once per locale and take a `locales` argument so tests pass `nl-NL` and `en-US`.

- Departure and arrival: `Intl.DateTimeFormat` with hour and minute; the travel date appears once in the table caption with `dateStyle: "full"`.
- Duration: `Intl.DurationFormat` (Baseline 2025; Node 24) with a feature-detected fallback to `Intl.NumberFormat` hour and minute units.
- Price: `Intl.NumberFormat` with `style: "currency"` and the currency from the `Amount`.
- Every value is wrapped in `<time dateTime>`: ISO instants for times, `PT2H30M` for durations.

Locale changes presentation only. The same `{ value: 15, currency: "EUR" }` renders as `€ 15,00` in `nl-NL`, `15,00 €` in `de-DE` and `€15.00` in `en-US`. Currency and amount are data from the API; converting currency would be a pricing decision behind the API, never in a formatter. UI copy is English (`<html lang="en">`) with all strings in `model/strings.ts`, so translation is a drop-in later; no i18n library.

## Components

```
App
└─ ErrorBoundary              "Something went wrong, reload the page"
   └─ SearchPage              composition only; useSearchParams + useJourneySearch
      ├─ <search>             HTML landmark
      │  └─ SearchForm        useActionState; props: defaultValues, initialErrors, onSearch
      │     ├─ ErrorSummary   role="alert"; focuses on every attempt
      │     └─ Field × 4      shared/ui; label + control + hint + error wiring
      └─ SearchResults        props: the union; aria-busy while loading
         ├─ StatusMessage     role="status", always mounted
         ├─ ErrorMessage      role="alert", only on error; message + Try again; takes focus
         └─ JourneyTable      props: caption, rows (formatted, with ids)
```

- `SearchPage` is a layout. The hook does the work.
- `SearchForm` never pushes history; it reports valid parameters through `onSearch`. Its tests need no URL.
- `ErrorSummary` focuses on every failed attempt, keyed on an attempt counter from the action state, including repeat failures with identical errors.
- Two live regions: polite status for loading, counts and no results; alert for errors. Switching `role` on a mounted element is unreliable across screen readers.
- `Field` generates ids and sets `aria-describedby` and `aria-invalid` once, not four times.
- `JourneyTable` contains no `Intl` call and no arithmetic. Four columns: Departure, Arrival, Duration, "Total for N passengers". Origin, destination and date are in the visible caption. Row ids come from the view model (composite of departure, arrival and price plus index).
- No component library: every control is native. Headless libraries earn their place on dialogs, menus, comboboxes and custom date pickers; this page has none. React Aria Components is the route if a combobox or date picker is ever needed.
- CSS Modules with modern CSS; tokens as custom properties in `shared/styles/tokens.css`; no runtime styling.

## Responsive

Mobile-first. Base styles are the phone layout; two breakpoints held as custom properties in `tokens.css`: around 640 px the form goes from one stacked column to two, around 960 px to one row with the button at the end. Units are `rem` and percentages with a page `max-width`; headings use `clamp`. Inputs and the primary button are 44 px tall at every width.

The results table stays a table at every width. Four short columns fit about 320 px in most locales; as a safety net the table sits in an `overflow-x: auto` wrapper that is keyboard focusable and labelled. Rows are never turned into cards, which would destroy table semantics for screen readers.

Verified manually at 320, 375, 768, 1024 and 1440 px (dates recorded below) and by the Playwright mobile project.

| Width                     | Checked on        |
| ------------------------- | ----------------- |
| 320, 375, 768, 1024, 1440 | _to be filled in_ |

## Accessibility

Target: WCAG 2.2 level AA.

| Item                                                                                                                           | WCAG 2.2                 | Verified by                           |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | ------------------------------------- |
| Landmarks and structure: `<main>`, one `<h1>`, `<search>` around the form, table with `<caption>` and `<th scope="col">`       | 1.3.1                    | axe, manual                           |
| Every control has a visible label, wired through `Field`                                                                       | 1.3.1, 3.3.2, 4.1.2      | jsx-a11y lint, axe                    |
| Errors identified and described: summary plus inline, `aria-invalid`, `aria-describedby`, instruction-style text               | 3.3.1, 3.3.3             | component tests, axe                  |
| Focus management: summary focused on each failed submit, error message focused on appearance, focus never lost on state change | 2.4.3, 2.4.7, 2.4.11     | component tests, manual keyboard      |
| Status messages via `role="status"` and `role="alert"`; polite updates never steal focus                                       | 4.1.3                    | component tests, manual screen reader |
| Full keyboard operation, logical tab order, Enter submits, no traps                                                            | 2.1.1, 2.1.2, 2.4.3      | manual keyboard                       |
| Visible focus indicator at 3:1 against adjacent colours                                                                        | 2.4.7, 1.4.11            | tokens, manual                        |
| Target size at least 24 × 24 CSS px for buttons and inputs                                                                     | 2.5.8                    | tokens, manual                        |
| Text contrast 4.5:1; non-text 3:1 for borders and focus rings                                                                  | 1.4.3, 1.4.11            | Lighthouse, contrast checker          |
| Reflow at 320 px with no horizontal scroll; usable at 200 % zoom                                                               | 1.4.10, 1.4.4            | manual                                |
| `<html lang="en">`                                                                                                             | 3.1.1                    | lint                                  |
| Document title reflects the search                                                                                             | 2.4.2                    | component test                        |
| Decorative spinner `aria-hidden`; animation stopped under `prefers-reduced-motion`                                             | 1.1.1, 2.3.3 (beyond AA) | CSS, manual                           |
| Native controls only, so name, role and value come from the browser                                                            | 4.1.2                    | by construction                       |

Tooling: `eslint-plugin-jsx-a11y` in lint; `vitest-axe` runs axe-core over every rendered state in the component tests; Lighthouse for contrast, which jsdom cannot measure. Automated tools find roughly 30 to 40 % of accessibility issues; the manual passes cover the rest.

| Manual pass                                    | Date              | Notes |
| ---------------------------------------------- | ----------------- | ----- |
| Keyboard-only walkthrough of all states        | _to be filled in_ |       |
| Screen reader walkthrough with NVDA on Windows | _to be filled in_ |       |

Known limitation: the native date input's screen-reader announcements vary by browser. It is accessible in all major ones; the label and a format hint cover the gap.

## Security

The brief asks that no invalid or insecure request reaches the search API. The API is a local function, so this is read as discipline rather than transport security:

- The API is called only with `ValidJourneyParameters`, which only the shared validator can produce. The API validates its own input as well and throws a typed error.
- Query strings are built with `URLSearchParams`, never concatenated.
- Known keys are read with `get()`; parameters are never spread into an object, which blocks `__proto__`-style keys; unknown keys are ignored; duplicate keys take the first value.
- Origin and destination are capped at 100 characters.
- URL values reach the page only through React props, never raw HTML.
- The query string is treated as untrusted on every load, including after our own `pushState`.
- No request while typing, none without a query string, no duplicates on re-render (React Query deduplicates).
- No secrets, no environment variables, no external calls.

## Performance

| Measure                      | Budget                                                                                                  | How                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Initial JavaScript           | under 100 KB gzipped (expected about 70: React and DOM about 45, TanStack Query about 13, app about 10) | `pnpm build` output and the size-check script |
| Lighthouse performance       | 95 or above, mobile and desktop                                                                         | recorded in the README                        |
| Layout shift on state change | 0                                                                                                       | reserved results height                       |
| Input delay                  | none from React                                                                                         | uncontrolled inputs                           |
| Font requests                | 0                                                                                                       | system font stack                             |
| Devtools in production       | 0 bytes                                                                                                 | lazy import behind `import.meta.env.DEV`      |

Formatters are created once per locale. Stale responses are never rendered. Vite's default modern browser target, no legacy plugin.

Deliberately not done, and when it would be: memoisation, when a profile shows wasted renders; virtualised rows, past a few hundred results; code splitting, when there is a second route; image optimisation, when there is an image; React Compiler, when there is something to memoise.

## Testing

| Layer         | What is tested                                                                                                                                                                                                                    | Tool                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `model`       | Validator rules and boundaries, including today is valid; URL codec round trip; `localDate` write and read paths under Europe/Amsterdam and America/New_York; duration maths; cents multiplication; formatters with fixed locales | Vitest                        |
| `api`         | Fixture builds 8 × 8 journeys; matching rules; case and whitespace folding; totals; sort order; frozen result; error trigger; invalid parameters rejected                                                                         | Vitest                        |
| hook          | The five states; stale response never shown                                                                                                                                                                                       | Vitest, Testing Library       |
| components    | Invalid submit shows the summary and focuses it; valid submit calls `onSearch`; URL on load renders each state; table text content                                                                                                | Testing Library, `user-event` |
| accessibility | No axe violations in each state and in the form with errors                                                                                                                                                                       | `vitest-axe`                  |
| end to end    | Empty form to results; invalid URL shows summary and never calls the API; origin `error` shows retry; the same three at 375 px                                                                                                    | Playwright                    |

Conventions: tests co-located as `*.test.ts(x)`; queries by role and label only, never test ids; interactions through `user-event`; no snapshots; `it.each` tables for rules; the mock injected through `ApiProvider` with `createSearchJourneys({ delayMs: 0, now })` rather than `vi.mock`; fake timers only where the delay itself is under test; coverage thresholds of 100 % on `model` and `api`, none on `ui`. Every bug found during development gets a failing test first.

Node reads `TZ` at startup, so the date suite runs as two invocations: a GitHub Actions matrix in CI, one command per shell locally (see `run.md`).

## Tooling

- TypeScript: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`; `lib` includes ES2025 for `Intl.DurationFormat`; `tsc --noEmit` as its own script.
- ESLint flat config: `typescript-eslint` `strictTypeChecked` and `stylisticTypeChecked` with `projectService`; `react-hooks`; `jsx-a11y` strict; `@tanstack/eslint-plugin-query`; `eslint-config-prettier` last; the import rules above as `no-restricted-imports` overrides.
- Prettier with a near-empty configuration; formats CSS as well, so no Stylelint.
- `.editorconfig`; `.vscode/extensions.json` and `settings.json` for format and fix on save.
- `simple-git-hooks` running `lint-staged` at pre-commit and `commitlint` at commit-msg, installed by the `prepare` script.
- `size-limit` with its file plugin measures the gzipped JavaScript in `dist/` after every build and fails above 100 kB.
- `knip` in CI with zero findings required.
- StrictMode on in development, which double-invokes effects and proves the hooks are idempotent.
- CI: job 1 runs lint, format check, typecheck, knip, unit tests in both time zones, build with size check; job 2 runs Playwright desktop and mobile.

## Dependencies

| Package                                                                                                                                                             | Role    | Motivation                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `react`, `react-dom`                                                                                                                                                | runtime | Required by the brief                                                                                |
| `@tanstack/react-query`                                                                                                                                             | runtime | Server state: stale-response safety, URL-keyed cache, declarative states                             |
| `typescript`, `vite`, `@vitejs/plugin-react`                                                                                                                        | dev     | Strict types; the standard client-only React build                                                   |
| `vitest` (with `@vitest/coverage-v8`), `jsdom`                                                                                                                      | dev     | Test runner native to Vite                                                                           |
| `@testing-library/react` (with its `@testing-library/dom` peer), `@testing-library/user-event`, `@testing-library/jest-dom`                                         | dev     | Tests through roles and labels; realistic interactions; readable DOM matchers                        |
| `vitest-axe`                                                                                                                                                        | dev     | axe-core in every component test                                                                     |
| `@playwright/test`                                                                                                                                                  | dev     | Three real-browser tests and a mobile viewport                                                       |
| `eslint` (with `@eslint/js`), `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `@tanstack/eslint-plugin-query`, `eslint-config-prettier` | dev     | Type-aware lint, hook rules, static accessibility, query-key correctness, no conflicts with Prettier |
| `prettier`                                                                                                                                                          | dev     | Formatting without debate                                                                            |
| `lint-staged`, `simple-git-hooks`                                                                                                                                   | dev     | Pre-commit formatting and lint on staged files                                                       |
| `@commitlint/cli`, `@commitlint/config-conventional`                                                                                                                | dev     | Rejects commit messages that are not Conventional Commits, so the history reads as documentation     |
| `knip`                                                                                                                                                              | dev     | Finds unused files, exports and dependencies                                                         |
| `size-limit`, `@size-limit/file`                                                                                                                                    | dev     | Enforces the 100 kB gzipped JavaScript budget on every build                                         |
| `@tanstack/react-query-devtools`                                                                                                                                    | dev     | Visible cache in development only                                                                    |

## Considered and not adopted

- Zod: one schema for two input sources is the real argument; declined because two of the four rules need custom code regardless and there is one schema in the whole app.
- React Router or TanStack Router: a router for a page with no routes.
- A hand-written reducer instead of TanStack Query: defensible for one call; see Data fetching for why the library was chosen.
- `use()` with Suspense: not a data-fetching solution on its own.
- Headless or styled component libraries: no control on this page needs one.
- Tailwind, zero-runtime CSS-in-TS, runtime CSS-in-JS: see decisions 09.
- A date library: nothing needs arithmetic beyond subtraction.
- React Compiler: nothing to memoise.
- Server rendering, PWA or offline support, analytics, error reporting: not needed for a single-page mock. The `ErrorBoundary` is where a production application would report.
- Stylelint: Prettier formats the five stylesheets.

## Browser support

Evergreen browsers, last two versions, matching Vite's default target. The one newer API, `Intl.DurationFormat`, has a fallback.

## Stretch items

Gated behind the core being implemented, tested and documented.

1. Station lookup: a `suggestStations` mock with normalised prefix matching and an accessible combobox (React Aria Components), showing the lookup-versus-search separation in code.
2. Earlier and later: the unit is the day, since the contract has no time. Either day navigation through the URL or appending adjacent days with `useInfiniteQuery`.
3. Polish: a swap button between origin and destination; dark mode through a `prefers-color-scheme` block over the tokens.
