# Running the application

## Prerequisites

| Tool    | Version     | How it is pinned                                                                                                     |
| ------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| Node.js | 24 LTS      | `.nvmrc` and the `engines` field in `package.json`                                                                   |
| pnpm    | as declared | the `packageManager` field in `package.json`; run `corepack enable` once and the right version is used automatically |

No environment variables, no secrets, no services. The search API is a local function.

## Install

```bash
pnpm install
```

## Scripts

| Command                             | What it does                                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Starts the Vite dev server at http://localhost:5173 with React Query Devtools mounted         |
| `pnpm build`                        | Production build into `dist/`, then the size check (fails above 100 KB gzipped of JavaScript) |
| `pnpm preview`                      | Serves `dist/` locally                                                                        |
| `pnpm test`                         | Unit and component tests with Vitest, in the current time zone                                |
| `pnpm test:coverage`                | Same, with the V8 coverage report; `model` and `api` must reach 100 %                         |
| `pnpm test:e2e`                     | Playwright: three end-to-end tests, desktop and mobile projects, against the production build |
| `pnpm lint`                         | ESLint with type-aware rules                                                                  |
| `pnpm format` / `pnpm format:check` | Prettier, write or verify                                                                     |
| `pnpm typecheck`                    | `tsc --noEmit` (Vite does not typecheck during build)                                         |
| `pnpm knip`                         | Reports unused files, exports and dependencies; must be empty                                 |

A pre-commit hook runs Prettier and ESLint on staged files, and a commit-msg hook checks the message against Conventional Commits. The hooks are written into `.git/hooks` by `simple-git-hooks` through the `prepare` script, so `pnpm install` sets them up; run `pnpm hooks:install` if they are ever missing.

## Time zones

The date tests must pass in a positive and a negative UTC offset. Node reads `TZ` at startup, so run the suite twice. CI does this in a matrix; locally:

PowerShell:

```powershell
$env:TZ = 'Europe/Amsterdam'; pnpm test
$env:TZ = 'America/New_York'; pnpm test
```

bash or zsh:

```bash
TZ=Europe/Amsterdam pnpm test
TZ=America/New_York pnpm test
```

## Seeing each state of the page

The mock serves the eight example journeys every day from tomorrow through the Friday of next week. Prices are per passenger in the data and totalled by the API.

| Address (after `http://localhost:5173`)                                                   | What you see                                                                                        |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `/`                                                                                       | The empty form. Passengers defaults to 1, the date to tomorrow.                                     |
| `/?origin=Enschede&destination=Hengelo&date=YYYY-MM-DD&passengers=2` with tomorrow's date | Loading, then the results table. The price column reads "Total for 2 passengers".                   |
| the same with today's date                                                                | "No journeys found": the data starts tomorrow.                                                      |
| `/?origin=enschede+&destination=HENGELO&date=…&passengers=1`                              | Results. Trailing spaces and capitals are folded.                                                   |
| `/?origin=Ensch&destination=Hengelo&date=…&passengers=2`                                  | "No journeys found": station names match exactly, not by prefix.                                    |
| `/?origin=Enschede&destination=Hengelo&date=2025-04-20&passengers=2`                      | Validation error: the date is in the past. The API is not called.                                   |
| `/?origin=Enschede&destination=Hengelo&date=…&passengers=11`                              | Validation error: passengers out of range.                                                          |
| `/?origin=Enschede&destination=Hengelo&date=…`                                            | Validation error: passengers missing.                                                               |
| `/?origin=error&destination=Hengelo&date=…&passengers=2`                                  | The error state with a "Try again" button. `error` is the reserved origin that makes the mock fail. |
| `/?origin=Enschede&destination=Enschede&date=…&passengers=2`                              | Validation error: destination must differ from origin.                                              |

Unknown query keys are ignored. If a key appears twice, the first value wins.

## Troubleshooting

- **Playwright cannot find a browser.** Run `pnpm exec playwright install chromium` once. The download is large; the unit tests do not need it.
- **Port 5173 is in use.** Vite picks the next free port and prints it; the examples above still work on that port.
- **Dates look off by one.** Check the `TZ` your shell is passing. The app itself treats a travel date as a calendar day in the browser's local time zone; see [assumptions.md](assumptions.md).
- **`Intl.DurationFormat` is missing in your browser.** Durations fall back to hour and minute units formatted with `Intl.NumberFormat`. Nothing else changes.
