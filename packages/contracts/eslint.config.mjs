import nodeConfig from "@auto-tm/eslint-config/node.mjs";

export default [
  { ignores: ["dist/**", "vitest.config.ts"] },
  ...nodeConfig,
  {
    files: ["scripts/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
