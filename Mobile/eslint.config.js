// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-native",
              importNames: ["StyleSheet"],
              message: "Use NativeWind className instead of StyleSheet in app screens.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='style']",
          message: "Use className (NativeWind) instead of style prop in app screens.",
        },
        {
          selector: "JSXAttribute[name.name='contentContainerStyle']",
          message: "Use contentContainerClassName (NativeWind) instead of contentContainerStyle.",
        },
      ],
    },
  },
]);
