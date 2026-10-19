import { ErrorBoundary } from "../shared/ui/ErrorBoundary.tsx";
import { SearchPage } from "../features/journey-search/index.ts";
import { Providers } from "./providers.tsx";

export function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <SearchPage />
      </Providers>
    </ErrorBoundary>
  );
}
