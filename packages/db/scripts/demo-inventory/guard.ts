/**
 * The guard for the demo inventory seed and its removal.
 *
 * Pure: it reads only the values it is given and does no I/O, so the entry point can run it before
 * any client is loaded. No message contains a variable's value. A refused input may be a real
 * connection string, and a malformed one can parse with a credential as its host, so failures name
 * the variable only.
 *
 * Two kinds of target pass:
 *  - a deployed environment (`APP_ENV` production or staging) reached on Railway's private network,
 *    which is how the founder runs it inside the API container;
 *  - a developer's or test's own database and MinIO on a loopback host.
 * A public database proxy, a public MinIO host and every other origin are refused. So is a database
 * URL with a `host` or `port` query parameter: the driver lets those override the URL's own host,
 * which would send a private-looking URL somewhere else.
 */
export type DemoInventoryMode = "seed" | "remove";

export interface DemoInventoryTarget {
  databaseUrl: string;
  minioEndpoint: string;
  minioAccessKey: string;
  minioSecretKey: string;
  minioRegion: string;
}

/** One value per mode, so a seed authorization left in the environment cannot authorize a removal. */
export const DEMO_INVENTORY_AUTHORIZATION: Record<DemoInventoryMode, string> = {
  seed: "seed-demo-inventory",
  remove: "remove-demo-inventory",
};

const DEPLOYED_ENVS = new Set(["production", "staging"]);
const LOCAL_ENVS = new Set(["development", "test"]);
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const PRIVATE_HOST_SUFFIX = ".railway.internal";

function refuse(mode: DemoInventoryMode, reason: string): never {
  throw new Error(`Demo inventory ${mode} refused: ${reason}`);
}

function hostOf(
  mode: DemoInventoryMode,
  key: string,
  value: string,
): { protocol: string; hostname: string; overridesHost: boolean } {
  try {
    const { protocol, hostname, searchParams } = new URL(value);
    return { protocol, hostname, overridesHost: searchParams.has("host") || searchParams.has("port") };
  } catch {
    return refuse(mode, `${key} must be a valid URL`);
  }
}

export function assertDemoInventoryTarget(
  env: Record<string, string | undefined>,
  mode: DemoInventoryMode,
): DemoInventoryTarget {
  const appEnv = env["APP_ENV"] ?? "";
  const deployed = DEPLOYED_ENVS.has(appEnv);
  if (!deployed && !LOCAL_ENVS.has(appEnv)) {
    refuse(mode, "APP_ENV must be production, staging, development or test");
  }
  if (env["DEMO_INVENTORY_AUTHORIZATION"] !== DEMO_INVENTORY_AUTHORIZATION[mode]) {
    refuse(mode, `set DEMO_INVENTORY_AUTHORIZATION=${DEMO_INVENTORY_AUTHORIZATION[mode]}`);
  }
  // Demo Listings belong in reviewer-only production. Removal must still work after it opens.
  if (mode === "seed" && appEnv === "production" && env["SIGNUPS_ENABLED"] !== "false") {
    refuse(mode, "SIGNUPS_ENABLED must be false to seed production");
  }

  const required = (key: string): string => env[key] || refuse(mode, `it requires ${key}`);
  const databaseUrl = required("DATABASE_URL");
  const minioEndpoint = required("MINIO_ENDPOINT");
  const minioAccessKey = required("MINIO_ACCESS_KEY");
  const minioSecretKey = required("MINIO_SECRET_KEY");

  const database = hostOf(mode, "DATABASE_URL", databaseUrl);
  if (database.protocol !== "postgres:" && database.protocol !== "postgresql:") {
    refuse(mode, "DATABASE_URL must be a PostgreSQL URL");
  }
  if (database.overridesHost) {
    refuse(mode, "DATABASE_URL must not set a host or port parameter");
  }
  const minio = hostOf(mode, "MINIO_ENDPOINT", minioEndpoint);
  for (const [key, hostname] of [
    ["DATABASE_URL", database.hostname],
    ["MINIO_ENDPOINT", minio.hostname],
  ] as const) {
    if (deployed && !hostname.endsWith(PRIVATE_HOST_SUFFIX)) {
      refuse(mode, `${key} must be a private Railway host in ${appEnv}`);
    }
    if (!deployed && !LOOPBACK_HOSTS.has(hostname)) {
      refuse(mode, `${key} must be a loopback host in ${appEnv}`);
    }
  }

  return {
    databaseUrl,
    minioEndpoint,
    minioAccessKey,
    minioSecretKey,
    minioRegion: env["MINIO_REGION"] || "us-east-1",
  };
}
