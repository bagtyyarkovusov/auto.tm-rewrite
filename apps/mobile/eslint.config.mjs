import expo from "@auto-tm/eslint-config/expo.mjs";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...expo,
  globalIgnores([
    ".expo/**",
    "assets/**",
    "scripts/**",
    "eslint.config.mjs",
    "expo-env.d.ts",
    "nativewind-env.d.ts",
    "metro.config.js",
    "babel.config.js",
    "tailwind.config.js",
  ]),
  {
    settings: {
      "import/ignore": ["react-native", "eslint/config"],
    },
    rules: {
      "import/no-unresolved": "off",
      "import/namespace": "off",
    },
  },
]);

export default eslintConfig;
