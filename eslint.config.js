import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import ts from "typescript-eslint";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.svelte-kit/**",
      "**/fixtures/**",
      "apps/frontend/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  prettier,
  {
    files: ["**/*.{js,cjs,mjs,ts,cts,mts}"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
