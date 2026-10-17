/**
 * Commit message rules. Goals:
 *
 * - Every commit is a Conventional Commit, so the history reads as a
 *   changelog and the type says what kind of change it was.
 * - Header fits git's classic 72 columns, so `git log --oneline` never wraps.
 * - Scope is optional, but when given it must name a real layer, so a typo
 *   like `feat(modle):` is rejected.
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [2, "always", 72],
    "scope-enum": [
      2,
      "always",
      ["api", "model", "ui", "shared", "app", "ci", "deps", "docs"],
    ],
  },
};
