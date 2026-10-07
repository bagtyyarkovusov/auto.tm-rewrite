import { TesterAccountsRefused, parseTesterAccounts } from "../src/tester-accounts";

export function assertTesterAccountsTarget(env: Record<string, string | undefined>, mode: "seed" | "remove"): string {
  if (env["TESTER_ACCOUNTS_AUTHORIZATION"] !== `${mode}-tester-accounts`) throw new TesterAccountsRefused("operator authorization missing");
  const appEnv = env["APP_ENV"];
  if (!["production", "staging", "development", "test"].includes(appEnv ?? "")) throw new TesterAccountsRefused("unknown environment");
  if (mode === "seed" && appEnv === "production" && env["SIGNUPS_ENABLED"] !== "false") throw new TesterAccountsRefused("production signups must be disabled");
  parseTesterAccounts(env["TESTER_ACCOUNTS_JSON"] ?? "[]", env["REVIEW_DEMO_ACCOUNTS_JSON"] ?? "[]");
  const databaseUrl = env["DATABASE_URL"] ?? "";
  let url: URL;
  try { url = new URL(databaseUrl); } catch { throw new TesterAccountsRefused("invalid database target"); }
  const deployed = appEnv === "production" || appEnv === "staging";
  const allowedHost = deployed ? url.hostname.endsWith(".railway.internal") : ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !allowedHost || url.searchParams.has("host") || url.searchParams.has("port")) {
    throw new TesterAccountsRefused("unsafe database target");
  }
  return databaseUrl;
}
