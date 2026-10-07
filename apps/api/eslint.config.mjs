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
    files: ["**/*.ts"],
    ignores: ["src/modules/identity/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^\\.\\.?/(\\.\\./)*(src/)?(modules/)?identity/(?!identity\\.(public|module)(\\.js)?$)",
              message:
                "Import identity through identity/identity.public (or identity.module for Nest composition).",
            },
          ],
        },
      ],
    },
  },
  {
    // Identity reaches uploads only through its own ProfilePhotoPort (#642).
    // The one Listings import it may hold is the Nest module, for composition.
    files: ["src/modules/identity/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^\\.\\.?/(\\.\\./)*(src/)?(modules/)?listings/(?!listings\\.module(\\.js)?$)",
              message:
                "Identity uses uploads through domain/ports/ProfilePhotoPort (or listings.module for Nest composition).",
            },
          ],
        },
      ],
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
