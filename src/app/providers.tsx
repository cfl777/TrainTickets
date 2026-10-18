/**
 * Application-wide providers. Goals:
 *
 * - One QueryClient for the app; per-query options live with the query
 *   in useJourneySearch, so tests with their own client get the same
 *   behaviour.
 * - The real search API injected here and nowhere else.
 * - React Query Devtools only on the dev server: the import is dynamic
 *   and guarded by a static mode check, so the build drops it entirely.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, type ReactNode } from "react";
import {
  ApiProvider,
  searchJourneys,
} from "../features/journey-search/index.ts";

const queryClient = new QueryClient();

const Devtools =
  import.meta.env.MODE === "development"
    ? lazy(() =>
        import("@tanstack/react-query-devtools").then((module) => ({
          default: module.ReactQueryDevtools,
        })),
      )
    : null;

export function Providers({ children }: { readonly children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider api={searchJourneys}>{children}</ApiProvider>
      {Devtools === null ? null : (
        <Suspense fallback={null}>
          <Devtools />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
