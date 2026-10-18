/**
 * Last line of defence for a render error. Goals:
 *
 * - A readable page instead of a blank one: one heading, one instruction.
 * - The only class component in the codebase, because React has no hook
 *   equivalent of componentDidCatch.
 * - In production this is where an error reporter would be called.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = Readonly<{ children: ReactNode }>;
type State = Readonly<{ hasError: boolean }>;

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main>
          <h1>Something went wrong</h1>
          <p>Reload the page to try again.</p>
        </main>
      );
    }
    return this.props.children;
  }
}
