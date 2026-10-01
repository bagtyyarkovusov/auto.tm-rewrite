/** Types for the CommonJS guard; see native-pr-seed-guard.cjs for the contract. */
export declare const NATIVE_PR_NAME: RegExp;
export declare const NATIVE_PR_PROJECT_ID: string;

type Env = Readonly<Record<string, string | undefined>>;

/** Throws unless `env` is this AutoTM PR environment's private-service seed environment. */
export declare function assertNativePrSeedEnvironment(env: Env): void;

/** Throws unless the fixture may write to its target; returns the connections it may use. */
export declare function assertFixtureTarget(
  env: Env,
  argv: readonly string[],
): { databaseUrl: string; minioEndpoint: string };
