import { resolve } from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: [
      { find: "@/", replacement: resolve(__dirname, "./") + "/" },
      { find: /^react-native$/, replacement: resolve(__dirname, "test/native-host.cjs") },
    ],
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./test/native-setup.ts", "./test/setup.ts"],
    // Expo Router turns every non-`+`-prefixed file under app/ into a route, so
    // test files must never live there. Route-level specs go in test/routes/.
    exclude: ["**/node_modules/**", "**/dist/**", "app/**"],
    env: {
      EXPO_PUBLIC_API_URL: "http://localhost:3006/api/v1",
      EXPO_PUBLIC_MEDIA_URL: "https://media.autotm.tm",
    },
  },
});
