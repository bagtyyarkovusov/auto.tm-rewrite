import nodeConfig from "@auto-tm/eslint-config/node.mjs";

export default [
  { ignores: ["vitest.config.ts"] },
  ...nodeConfig,
];
