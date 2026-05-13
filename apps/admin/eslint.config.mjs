import nextjs from "@auto-tm/eslint-config/nextjs.mjs";

export default [
  ...nextjs,
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      "import/no-unresolved": "off",
    },
  },
];
