/**
 * Runs before every test file. Goals:
 *
 * - jest-dom matchers such as toBeInTheDocument on Vitest's expect.
 * - vitest-axe's toHaveNoViolations, so every rendered state can be
 *   checked for accessibility violations.
 * - Unmount after each test. Testing Library only does this by itself
 *   when test globals are on, and this project imports from vitest
 *   explicitly instead.
 * - Two browser APIs jsdom does not implement, matchMedia and
 *   scrollIntoView, which the page uses to scroll results into view on
 *   narrow screens. Stubbed as "wide screen, no motion preference".
 * - A third, HTMLCanvasElement.getContext, which axe-core's colour-contrast
 *   matcher calls to detect icon ligatures. jsdom returns null and logs
 *   "Not implemented" once per axe run; the stub returns the same null
 *   without the log. Either way colour contrast is not checked here: axe
 *   records the rule as incomplete, so it needs a real browser.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";

expect.extend(axeMatchers);
afterEach(cleanup);

const matchMedia = (query: string): MediaQueryList =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }) as MediaQueryList;

vi.stubGlobal("matchMedia", matchMedia);
Element.prototype.scrollIntoView = () => undefined;
HTMLCanvasElement.prototype.getContext = () => null;
