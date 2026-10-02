import { resolve } from "node:path";
import original from "../../../../apps/mobile/vitest.config";

const repoRoot = resolve(__dirname, "../../../..");
export default {
  ...original,
  root: __dirname,
  test: {
    ...original.test,
    setupFiles: [
      resolve(repoRoot, "apps/mobile/test/native-setup.ts"),
      resolve(repoRoot, "apps/mobile/test/setup.ts"),
    ],
    include: ["*.spec.tsx"],
  },
};
