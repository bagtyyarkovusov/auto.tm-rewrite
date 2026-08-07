import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const appDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Monorepo Docker images run the standalone server (infra/docker/admin.Dockerfile).
  output: "standalone",
  outputFileTracingRoot: join(appDir, "../../"),
};

export default nextConfig;
