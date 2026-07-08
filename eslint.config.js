// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const tseslintPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tseslintPlugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          vars: "all",
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
          caughtErrors: "all",
        },
      ],
      "max-depth": ["error", 3],
      complexity: ["warn", 10],
      "no-restricted-syntax": [
        "error",
        {
          selector: "Property[key.name='fontSize'] > Literal[raw=/^[0-9]/]",
          message:
            "Use a Typography token from lib/typography.ts instead of a numeric fontSize (add the token there if the type scale is missing one).",
        },
      ],
    },
  },
  {
    // The type scale itself is where literal font sizes live.
    files: ["lib/typography.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    files: ["supabase/functions/**/*.ts"],
    rules: {
      "import/no-unresolved": "off",
    },
  },
]);
