import node from "@auto-tm/eslint-config/node.mjs";

export default [
  { ignores: ["dist/**"] },
  ...node,
  {
    files: ["**/*.module.ts"],
    rules: {
      "@typescript-eslint/no-extraneous-class": "off",
    },
  },
  {
    rules: {
      "import/no-unresolved": "off",
    },
  },
];
