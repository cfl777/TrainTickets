/**
 * Runs before every test file. Goals:
 *
 * - jest-dom matchers such as toBeInTheDocument on Vitest's expect.
 * - vitest-axe's toHaveNoViolations, so every rendered state can be
 *   checked for accessibility violations.
 * - Unmount after each test. Testing Library only does this by itself
 *   when test globals are on, and this project imports from vitest
 *   explicitly instead.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";

expect.extend(axeMatchers);
afterEach(cleanup);
