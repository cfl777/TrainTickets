# Decisions

An architecture decision log for the Train Journeys assignment. One entry per decision, in the order they were taken, each with the options considered and why one was chosen. Reviewed step by step on 16 and 17 October 2026 before any code was written. Assumptions about the brief itself are in [assumptions.md](assumptions.md); this file covers how the application is built.

## 01 · Scope and assumptions (16–17 Oct 2026)

Nine ambiguities were resolved before anything else, because the API, validation and URL format all depend on them. Five became entries in [assumptions.md](assumptions.md). The rest were design choices: duration is derived by a pure function rather than added to the given type; the mock takes an injectable delay and clock through a factory and has one deterministic failure trigger; the query string uses `origin`, `destination`, `date` and `passengers`; the application has exactly one route.

## 02 · Language and toolchain (16–17 Oct 2026)

**Decided:** TypeScript in strict mode, Vite with the react-ts template, React 19, pnpm, ESLint with Prettier.

**Options considered:** JavaScript with JSDoc (the brief hands us types; the compiler is the first line against regression). Next.js (a single client-only page with a mock API has no server rendering need). Create React App (unmaintained). npm (zero-friction, but pnpm's lockfile and strict isolation make the reviewer's install reproducible, and Corepack removes the install step). Biome (faster than ESLint, but without the accessibility rule set).

## 03 · Layers and folder structure (17 Oct 2026)

**Decided:** feature-sliced. `src/features/journey-search/{api,model,ui}`, plus `shared` and `app`. Import direction is one way and enforced by lint: `ui → model → api`; `api` and the pure files in `model` never import React; `shared` never imports from `features`; `app` imports a feature only through its `index.ts`.

**Options considered:** flat (nothing stops a formatter importing React or a component filtering journeys; no story to tell). Thin layers by kind of code (same inner boundaries; chosen against only because grouping by feature reads more naturally and is ready for a second feature). There is one feature today; the structure says so.

## 04 · URL as the source of truth (17 Oct 2026)

**Decided:** submitting the form does not search; it writes the URL. The page reacts to the URL, so direct open, submit, back and forward are one code path. A custom `useSearchParams` hook on `useSyncExternalStore` subscribes to `popstate` plus an event dispatched after our own `pushState`. `setSearch` pushes a history entry unless the URL is unchanged. Parsing stays outside the hook.

**Options considered:** React Router only for `useSearchParams` (a router for a page with no routes is hard to motivate). TanStack Router (typed search params, but we write the same validator anyway).

## 05 · Form and validation (16–17 Oct 2026)

**Decided:** one hand-written `validateJourneyParameters(raw, now)` in `model`, used by the form action and the URL parser, returning per-field errors. React 19 `<form action>` with `useActionState`; the form is keyed on the URL search string so React's post-action reset lands on fresh defaults. Uncontrolled inputs read from `FormData`. `noValidate` on the form so our feedback is the only feedback. Submit button always enabled. Passengers is a native number input. Date input has `min` set to today. Origin equal to destination is rejected. Validation feedback follows the GOV.UK and NL Design System pattern: summary with focus on submit, inline messages, per-field clearing after the first failed submit, no success ticks, instruction-style messages.

**Options considered:** native HTML validation only (uneven per browser, does nothing for URL input). React Hook Form with Zod (two dependencies for four fields). Zod alone (one schema for two input sources is the real argument; declined because two of the five rules need custom code regardless, and there is only one schema in the app to amortise over). Disabled submit button (hides the reason from keyboard and screen-reader users). `<select>` for passengers (sturdier, but the number input is what the brief says and is the native `spinbutton` that rail sites' steppers reimplement).

## 06 · The mock search API (17 Oct 2026)

**Decided:** `searchJourneys` keeps the brief's exact signature and is the default instance from `createSearchJourneys({ delayMs, now })`. The timetable file has one row per service with `sourceDate`, times and `unitPriceCents`. `buildJourneys` creates each service for every day from +1 to +8 at call time. `filterJourneys` is pure and synchronous: collator matching, local-day matching, totals in cents, sorted by departure, frozen result. Two typed errors: `InvalidParametersError` and `SearchError`. Origin `error` triggers the second.

**Options considered:** mapping the two source dates to two days only (six empty days in the review week). Random latency or random failures (flaky tests and unreproducible reviews). A `fail=1` query key as the error trigger (cannot come from the form and needs a special case in the hardened parser).

## 07 · Async flow and states (16–17 Oct 2026)

**Decided:** TanStack Query v5 behind `useJourneySearch`, which returns a discriminated union: `idle`, `invalid`, `loading`, `success`, `error`. Configuration: `retry: 0`, `refetchOnWindowFocus: false`, `refetchOnReconnect: false`, `staleTime` five minutes, query key built from validated parameters with the date as a string, `enabled` only on valid parameters, devtools in development only. Old results are cleared while a new search loads; the results area keeps a reserved height.

**Options considered:** a hand-written reducer with a request counter (fully defensible for one call; chosen against because Query removes the stale-response bug class structurally, gives a URL-keyed cache for back navigation, and is the standard tool for server state). `use()` with Suspense (not a data-fetching solution on its own). `keepPreviousData` (rail sites keep results only when refining the same result set, which this page does not do). Optimistic updates (a mutation technique; a search is a read).

## 08 · Formatting and locale (17 Oct 2026)

**Decided:** `Intl` only. `navigator.languages` is passed explicitly and injected into formatters, which are created once per locale. Times via `DateTimeFormat`; price via `NumberFormat` with the currency from the `Amount`; duration via `Intl.DurationFormat` with a feature-detected fallback to `NumberFormat` units. Every value is wrapped in `<time dateTime>`. Locale changes presentation only; currency and amount are data from the API.

**Options considered:** `date-fns` or Temporal (nothing here needs arithmetic beyond subtraction). Hand-built `2h 30m` (not localised). `NumberFormat` units only for duration (works everywhere; chosen against because `DurationFormat` is the purpose-built API and the fallback makes it safe).

## 09 · Components and styling (16–17 Oct 2026)

**Decided:** no component library; semantic HTML and native controls. CSS Modules with modern CSS and design tokens as custom properties. The tree after review: `ErrorBoundary` › `SearchPage` (composition only) › `<search>` › `SearchForm` with `ErrorSummary` and four `Field`s, and `SearchResults` with `StatusMessage` (polite, always mounted), `ErrorMessage` (alert, only on error) and `JourneyTable` (pre-formatted rows with ids). Action-state errors take precedence over URL errors.

**Options considered:** Base UI, React Aria Components, Radix (headless libraries earn their place on dialogs, menus, comboboxes and custom date pickers; this page has none). Styled libraries (design decisions and weight for five components). Tailwind v4 (the strong runner-up; utility strings read less clearly in a reviewed codebase). Zero-runtime CSS-in-TS (out of proportion). Runtime CSS-in-JS (styled-components is in maintenance mode). One live region switching role (unreliable across screen readers).

## 10 · Accessibility (17 Oct 2026)

**Decided:** WCAG 2.2 AA as the named target. A fourteen-item checklist mapped to success criteria, each with a verification method: jsx-a11y lint, axe-core in every component test through `vitest-axe`, Lighthouse for contrast, and manual keyboard and NVDA passes recorded by date. The native date input's varying screen-reader behaviour is stated as a known limitation.

**Options considered:** checklist without automated axe (lint and manual only; declined because axe turns the checklist into a regression test for one dev dependency).

## 11 · Responsiveness and performance (16–17 Oct 2026)

**Decided:** mobile-first CSS with two tokenised breakpoints near 640 and 960 pixels, `rem` units, 44-pixel targets, the results table kept as a table inside a focusable scroll wrapper. Budget: under 100 KB of gzipped JavaScript, Lighthouse 95 or above, zero font requests, devtools absent from the build. A "would do when" list for memoisation, virtualisation, code splitting and image optimisation.

**Options considered:** turning table rows into cards on narrow screens (destroys table semantics for screen readers). A web font (the single largest avoidable cost on a page this small). React Compiler (nothing to memoise; adds a Babel plugin).

## 12 · Testing strategy (17 Oct 2026)

**Decided:** Vitest with Testing Library, `user-event` and `vitest-axe`. The mock is injected through a small `ApiProvider` rather than `vi.mock`. The date suite runs in two time zones through a CI matrix. Tests sit in a `__tests__` folder beside the code they cover, query by role and label only, use no snapshots, and use `it.each` tables for rules. Coverage thresholds of 100 % on `model` and `api`, none on `ui`. Playwright for three end-to-end tests with a mobile viewport project, in a separate CI job. Every bug found gets a failing test first.

**Options considered:** `vi.mock` for the API (invisible magic coupled to file paths). No Playwright (shorter install; declined because it is the only layer that runs the real date input, real `Intl`, real focus and real viewports).

## 13 · Delivery (17 Oct 2026)

**Decided:** five documents: `README.md` in the root and `run.md`, `assumptions.md`, `architecture.md`, `decisions.md` under `docs/`. A dependency table with three runtime packages. TypeScript strict flags, a flat ESLint config with type-aware rules and import boundaries, minimal Prettier, editor settings, `lint-staged` with `simple-git-hooks` at pre-commit, `knip` in CI, a size-check script, Conventional Commits, CI in two jobs, a hosted preview.

**Options considered:** CI as the only gate without hooks (shorter dependency list; declined because a clean commit history is part of what is reviewed). Stylelint (Prettier formats the stylesheets).

## 14 · Stretch: station lookup (16 Oct 2026, gated; built 18 Oct 2026, see 23)

A `suggestStations` mock with normalised prefix matching, and an accessible combobox in the UI, with React Aria Components as the chosen route if built. Starts only after the core is implemented, tested and documented. The mock is added together with the UI, never alone.

## 15 · Stretch: earlier and later (17 Oct 2026, gated)

The brief's contract has a date and no time, and the API returns a whole day, so the unit for earlier and later is the day. Two routes: day navigation through the URL, or appending adjacent days with `useInfiniteQuery`, which is the rail-site pattern. Route to be chosen when the gate opens.

## 16 · Review additions (17 Oct 2026)

A final pass over the whole design. Adopted: form defaults (passengers 1, date tomorrow); a hosted preview; a "how to review" section; the station time zone simplification stated; English UI with strings in one module; a branded `ValidJourneyParameters` type ("parse, don't validate"); `readonly` and `as const` throughout; mobile input hints; scrolling results into view on narrow screens; server rendering, PWA, analytics and error reporting named as declined; a browser support statement; StrictMode on in development; this decisions log.

## 17 · Stretch: polish (17 Oct 2026, gated)

A swap button between origin and destination, and dark mode through a `prefers-color-scheme` block over the tokens. Dark mode was built on 18 Oct 2026: the same sixteen token names redefined once, every text, border and focus pair re-checked against WCAG AA (the tightest is the input border at 5.3:1 against a 3:1 requirement), `color-scheme` set so the native date picker follows, and no component aware of the mode. The swap button stays gated.

## 18 · Commit message linting (17 Oct 2026)

**Decided:** `commitlint` with `config-conventional` at the commit-msg hook, through the same `simple-git-hooks`. Header at most 72 characters; scope optional but, when given, one of `api`, `model`, `ui`, `shared`, `app`, `ci`, `deps`, `docs`. The package's own install script is left disabled under pnpm 10; the `prepare` script installs the hooks explicitly instead.

**Options considered:** Husky (a second hook manager for the same job). A hand-written regex script (zero dependencies, but unmaintained rules and worse error messages). A CI step over the commit range (one committer, and the hook already covers it).

## 19 · Bundle size check (18 Oct 2026)

**Decided:** `size-limit` with `@size-limit/file`, configured in `package.json` to measure `dist/assets/*.js` gzipped against a 100 kB limit, run at the end of `pnpm build`. Gzip rather than size-limit's default Brotli so the number matches Vite's build output and the budget as written.

**Options considered:** A hand-written script over `node:zlib` (thirty lines, no dependency; declined in favour of the recognised tool, whose GitHub Action posts the size delta on pull requests, added on 18 Oct 2026 once the repository had them). `@size-limit/preset-app` (bundles with webpack and measures load time; it would measure a different build from the one shipped). `bundlesize` (unmaintained).

## 20 · Branches and pull requests (18 Oct 2026)

**Decided:** from Phase 3 on, each item in the README's "How to review" order is built on its own branch and merged through a pull request: `feat/model-types`, `feat/model-validation`, `feat/model-url-and-date`, `feat/api-mock`, `feat/model-search-hook`, `feat/ui`. `main` is protected: the three CI jobs must pass, history is linear, and nobody pushes to it directly. Merges are rebase-only, so every commit survives and the history stays the deliverable it has been since the first commit. Pull request descriptions follow the commit message shape: a goal line and bullets.

**Options considered:** Committing to `main` with CI reporting after the fact (how Phase 2 was done; a red run would already be in the history). Squash merging (one commit per pull request, which would discard the granular history). Merge commits (keep the commits but add a merge node per pull request; declined for the linear history).

## 21a · Hosted preview (18 Oct 2026)

**Decided:** a Vercel project named `train-journeys`, linked to the GitHub repository through the Git integration. `main` deploys to production at https://train-journeys.vercel.app with the repository's own `pnpm build`, so the typecheck and the size check gate the deploy as well. Preview deployments are switched off: only `main` is deployed, and the site is public. The README names the link and the commit it reflected when the numbers were taken. The site allows a first look without installing anything, and it gives the Lighthouse numbers a real origin instead of a local preview server.

**Options considered:** No hosted link, as the brief asks only for run instructions (declined, but the local route stays first in the README and the hosted one is an addition, not a replacement). Per-pull-request preview deployments, Vercel's default (switched off: CI already builds every pull request, the previews would sit behind a Vercel login, and one live site is easier to reason about than many). Vercel's default protection, which leaves the production domain open and every other deployment URL behind a login (kept as it is: a login wall on the link would be worse than no link). A stale link is the main cost: mitigated by production tracking `main` automatically and by the README naming the commit. The Vercel hobby plan is for non-commercial use, which an assignment is; a company would use a team plan or its own hosting. GitHub Pages (needs a workflow and a base path change for the repository subpath). Netlify (equivalent; Vercel chosen because the account already existed).

## 21b · Visual direction: the ticket (18 Oct 2026)

**Decided:** of three directions mocked up (a quiet service look, a departure board with a dark header band, and a ticket), the ticket: off-white page, the form as a white card with a teal edge and inline icons, examples as placeholders instead of hint lines, results as spaced white rows with times in bold and the price in a tinted pill. The accent moved from blue to teal (6.1:1 on white, so it doubles as the focus ring). Everything stays within the constraints: no component library, system font, the existing tokens, AA contrast, a real table for results. A note under the form names the three stations the demo serves, since nothing else told a visitor what to type.

**Options considered:** the quiet service look (closest to the first build; least visual identity). The departure board (strongest identity, but a dark band over a single form reads as decoration). Icons from a library (four inline SVG paths cost nothing and keep the dependency list as it was).

## 22 · Inline errors instead of an error summary (18 Oct 2026)

**Decided:** validation messages sit directly under their fields; after a failed submit, focus moves to the first invalid field and a visually hidden alert announces how many fields need attention. The error summary box from decision 05 is removed. What accessibility requires is kept: every error identified and described at its field (3.3.1, 3.3.3), a failed submit announced (4.1.3), and focus sent somewhere useful (2.4.3). The attempt counter still drives refocusing on a repeated failure, and per-field clearing after the first submit is unchanged.

**Why:** the summary pattern was designed for long government forms, where a list at the top is a table of contents for the errors. On a form with four fields on one screen it duplicated every message, dominated the card, and read as heavy. Focusing the first invalid field is the pattern most product forms use and is simpler to explain.

**Options considered:** keeping the summary as a single quiet line with links (lighter, but still a duplicate of what is under the fields). No announcement at all (sighted users would see the messages but screen-reader users would hear only a focus change; rejected).

## 23 · Station lookup: React Aria, loaded on demand (18 Oct 2026)

**Decided:** the station fields are a combobox from React Aria Components over a `suggestStations` mock (prefix matching, the same collator as the search, an empty query lists every station). The library is reached only through a dynamic import in `StationField`, so Vite ships it as its own chunk; until it arrives the field is the plain input it replaces, with the same id, name, label and error, and hands over whatever was typed or focused. The combobox keeps the form contract: the text is the value (`allowsCustomValue`), FormData reads it by name, validation stays in the model and its message is passed in as the field's error. The size check now has two entries: the initial JavaScript under 100 kB and the lookup chunk under 70 kB.

**Why a library here:** a combobox is the one control on the page where the native element is not enough, and hand-rolling the ARIA pattern (roles, active descendant, keyboard, live announcement of the option count, popover placement and dismissal) is where accessibility bugs come from. React Aria is the headless library decision 09 reserved for exactly this case.

**Why on demand:** measured on a probe branch, the combobox in the initial bundle took it from 83.1 to 143.5 kB gzipped, over the budget that decision 19 enforces and that stands in for the brief's performance expectations. As a separate chunk the initial bundle is 84.3 kB and the chunk 60.0 kB, requested at first render and cached by the browser afterwards.

**Consequences accepted:** while a popup is open React Aria hides the rest of the page from assistive technology, so tests close the popup before reaching for other controls; a plain click outside still works. React resets the form after an action, which would clear the combobox state, so the two station fields re-mount on each failed attempt with the submitted values. Enter with the popup open commits the highlighted or typed station and a second Enter submits, as on most rail sites.

**Options considered:** a `datalist` (no option styling, uneven screen-reader support, no control over the empty state). A hand-rolled ARIA combobox (about as much code as this feature again, and the part most likely to be wrong). Keeping the library in the initial bundle (simplest, but 43 kB over budget). Raising the budget (the budget is the point).

## 24 · Ticket header: the heading in the stub (19 Oct 2026)

**Decided:** the form card becomes a visible ticket. A wrapper in `SearchPage` owns the card styling that the form used to carry; its stub holds the real `h1` and a decorative, `aria-hidden` route line (origin ring, track, destination dot, the words "Origin" and "Destination" uppercased by CSS); a dashed perforation with a notch at each edge separates the stub from the fields. CSS only, tokens only, no SVG, no dependency, no animation. The `h1` moves inside the `<search>` landmark and stays the page's only heading, so the structure and title decisions (1.3.1, 2.4.2) are unaffected; the route text is muted on the card, already 4.5:1.

**Why:** the stylesheet had called the form a ticket since decision 21 without showing it. This makes the metaphor visible at zero bytes of graphics and leaves every accessibility and sizing decision intact: the title stays a DOM heading that scales with the user's font.

**Options considered:** eight header graphics were mocked up: an SVG ticket band, a route diagram, two train silhouettes, rails turning into the query string, a departure line, a typographic track and a results skeleton. The SVG ticket band was the strongest and was declined because it puts the title inside an SVG, forcing a hidden `h1` and a title that does not scale with the user's font; a reviewer with a screen reader or at 200 % zoom would notice before anyone admired the picture. The rest were either decoration over a single form (the departure-board objection from decision 21 again) or needed a dependency.
