import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", ".agent-reach-venv/**", "cloudflare/worker-configuration.d.ts"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["app/admin/dashboard/page.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["app/page.tsx", "app/admin/dashboard/page.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];

export default eslintConfig;
