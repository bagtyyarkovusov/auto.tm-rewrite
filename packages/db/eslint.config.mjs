import nodeConfig from "@auto-tm/eslint-config/node.mjs";

export default [
  { ignores: ["generated/**", "prisma/seed/**", "vitest.config.ts"] },
  ...nodeConfig,
];
