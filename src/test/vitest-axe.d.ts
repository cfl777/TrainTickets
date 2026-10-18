/**
 * vitest-axe 0.1.0 ships types for the `Vi` global namespace, which Vitest
 * removed in version 3. This augmentation registers its matcher on the
 * current `vitest` module instead, mirroring what jest-dom does.
 */
import "vitest";
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars -- must repeat Vitest's own `Assertion<T = any>` exactly
  interface Assertion<T = any> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
