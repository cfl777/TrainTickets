import js from "@eslint/js";
import pluginQuery from "@tanstack/eslint-plugin-query";
import prettier from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

/**
 * ESLint configuration. Goals, in order of importance:
 *
 * - Type-aware linting: typescript-eslint's strict and stylistic presets,
 *   fed by TypeScript's project service so rules can see real types.
 * - Accessibility at lint time: jsx-a11y in strict mode, since the target
 *   is WCAG 2.2 AA and static checks are the cheapest layer.
 * - Correct hooks and queries: the React hooks rules and the TanStack Query
 *   plugin, which checks query keys and useQuery usage.
 * - Enforced layer boundaries: no-restricted-imports overrides keep the
 *   import direction ui -> model -> api, keep React out of api and the pure
 *   model files, stop shared importing from features, and let app reach a
 *   feature only through its index.ts.
 * - No overlap with Prettier: eslint-config-prettier comes last and turns
 *   off every formatting rule, so ESLint reports problems and Prettier
 *   owns layout.
 */
export default defineConfig([
  globalIgnores(["dist", "coverage", "playwright-report", "test-results"]),

  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.strict,
      pluginQuery.configs["flat/recommended"],
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-empty-object-type": [
        "error",
        { allowInterfaces: "with-single-extends" },
      ],
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    },
  },

  {
    // Declaration files merge into existing interfaces (declaration
    // merging), which only works with `interface`.
    files: ["**/*.d.ts"],
    rules: { "@typescript-eslint/consistent-type-definitions": "off" },
  },

  // Import boundaries: ui -> model -> api, one way.
  {
    files: ["src/features/*/api/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: ["react", "react-dom"],
          patterns: [
            {
              // The brief's contract types live in model/types.ts and the
              // mock implements them; nothing else in model is reachable.
              group: ["**/model/**", "!**/model/types.ts"],
              message: "api may import only the contract types from model.",
            },
            {
              group: ["**/ui/**"],
              message: "api never imports ui.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/*/model/**"],
    ignores: [
      "src/features/*/model/use*.ts",
      "src/features/*/model/**/*.test.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: ["react", "react-dom", "@tanstack/react-query"],
          patterns: ["**/ui/**"],
        },
      ],
    },
  },
  {
    files: ["src/features/*/model/use*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: ["**/ui/**"] }],
    },
  },
  {
    files: ["src/features/*/ui/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: ["@tanstack/react-query"], patterns: ["**/api/**"] },
      ],
    },
  },
  {
    files: ["src/shared/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: ["**/features/**"] }],
    },
  },
  {
    files: ["src/app/**", "src/main.tsx"],
    rules: {
      "no-restricted-imports": ["error", { patterns: ["**/features/*/*"] }],
    },
  },

  prettier,
]);
