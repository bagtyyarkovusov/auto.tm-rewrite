import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertTesterAccountsTarget } from "./tester-accounts-guard";

const base = { APP_ENV: "test", TESTER_ACCOUNTS_AUTHORIZATION: "seed-tester-accounts", DATABASE_URL: "postgresql://fake:fake@127.0.0.1:1/test", TESTER_ACCOUNTS_JSON: "[]" };

describe("tester operator target guard", () => {
  it("accepts local test and private staging/production targets with mode-specific authorization", () => {
    expect(assertTesterAccountsTarget(base, "seed")).toBe(base.DATABASE_URL);
    for (const APP_ENV of ["staging", "production"]) {
      const env = { ...base, APP_ENV, SIGNUPS_ENABLED: "false", DATABASE_URL: "postgresql://fake:fake@postgres.railway.internal:5432/test" };
      expect(assertTesterAccountsTarget(env, "seed")).toBe(env.DATABASE_URL);
      expect(assertTesterAccountsTarget({ ...env, TESTER_ACCOUNTS_AUTHORIZATION: "remove-tester-accounts", SIGNUPS_ENABLED: "true" }, "remove")).toBe(env.DATABASE_URL);
    }
  });

  it("refuses missing/wrong authorization, unknown environment, public/overridden hosts and production seed with open signups", () => {
    const invalid = [
      { TESTER_ACCOUNTS_AUTHORIZATION: "" }, { TESTER_ACCOUNTS_AUTHORIZATION: "remove-tester-accounts" }, { APP_ENV: "pr-713" },
      { DATABASE_URL: "postgresql://fake:fake@public.example.invalid/test" }, { DATABASE_URL: `${base.DATABASE_URL}?host=public.example.invalid` },
      { DATABASE_URL: `${base.DATABASE_URL}?port=5432` }, { DATABASE_URL: "bad" }, { DATABASE_URL: "https://127.0.0.1/test" },
      { APP_ENV: "production", DATABASE_URL: "postgresql://fake:fake@postgres.railway.internal/test", SIGNUPS_ENABLED: "true" },
      { APP_ENV: "staging" },
    ];
    for (const input of invalid) expect(() => assertTesterAccountsTarget({ ...base, ...input }, "seed")).toThrow(/refused/);
  });

  it("CLI refuses before driver loading and never echoes config, phones, emails, codes or driver errors", () => {
    const entry = { phone: "+99370000001", email: "fixture@example.invalid", code: "765432" };
    const DATABASE_URL = "postgresql://fixture:credential-fixture@public.example.invalid/test";
    const script = fileURLToPath(new URL("./tester-accounts.ts", import.meta.url));
    for (const args of [["--mode", "seed"], ["--mode", "remove"], [], ["--mode", "secret-fixture"]]) {
      const result = spawnSync(process.execPath, ["--import", "tsx", script, ...args], { cwd: fileURLToPath(new URL("..", import.meta.url)), encoding: "utf8", env: { PATH: process.env["PATH"], ...base, DATABASE_URL, TESTER_ACCOUNTS_JSON: JSON.stringify([entry]) } });
      expect(result.status).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain("Tester accounts refused or failed");
      for (const secret of [entry.phone, entry.email, entry.code, DATABASE_URL, "credential-fixture", "secret-fixture"]) expect(output).not.toContain(secret);
    }
  });

  it("CLI on an authorized empty list prints only zero counts", () => {
    const script = fileURLToPath(new URL("./tester-accounts.ts", import.meta.url));
    const result = spawnSync(process.execPath, ["--import", "tsx", script, "--mode", "seed"], { cwd: fileURLToPath(new URL("..", import.meta.url)), encoding: "utf8", env: { PATH: process.env["PATH"], ...base } });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ created: 0, scheduled: 0, sessionsDeleted: 0, listingsArchived: 0 });
    expect(result.stderr).toBe("");
  });
});
