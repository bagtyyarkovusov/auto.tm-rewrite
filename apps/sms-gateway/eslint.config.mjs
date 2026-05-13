import node from "@auto-tm/eslint-config/node.mjs";

export default [
  ...node,
  {
    rules: {
      // ESM requires .js extensions in imports, which ts handles at compile time
      "import/no-unresolved": "off",
    },
  },
];
