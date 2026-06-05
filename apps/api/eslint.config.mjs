import node from "@auto-tm/eslint-config/node.mjs";

export default [
  { ignores: ["dist/**"] },
  { linterOptions: { reportUnusedDisableDirectives: "off" } },
  ...node,
  {
    files: ["**/*.module.ts"],
    rules: {
      "@typescript-eslint/no-extraneous-class": "off",
    },
  },
  {
    rules: {
      "import/order": "off",
      "import/no-unresolved": "off",
    },
  },
  {
    files: ["**/*.spec.ts", "**/*.e2e.spec.ts"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["src/modules/listings/infrastructure/EventEmitterListingEventPublisher.ts"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
];
