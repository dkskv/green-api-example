import stylistic from "@stylistic/eslint-plugin";
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: ["return", "throw"] },
        { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
        {
          blankLine: "any",
          prev: ["const", "let", "var"],
          next: ["const", "let", "var"],
        },
        { blankLine: "always", prev: "import", next: "*" },
        { blankLine: "any", prev: "import", next: "import" },
        {
          blankLine: "always",
          prev: "*",
          next: [
            "if",
            "try",
            "for",
            "while",
            "do",
            "switch",
            "function",
            "class",
            "interface",
            "type",
            "multiline-expression",
          ],
        },
        {
          blankLine: "always",
          prev: [
            "if",
            "try",
            "for",
            "while",
            "do",
            "switch",
            "function",
            "class",
            "interface",
            "type",
            "multiline-expression",
          ],
          next: "*",
        },
      ],
    },
    languageOptions: {
      globals: globals.browser,
    },
  },
]);
