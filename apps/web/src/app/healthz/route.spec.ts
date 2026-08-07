import { afterEach, describe, expect, it } from "vitest";

import { GET } from "./route";

const saved = new Map<string, string | undefined>();

function setEnv(
  name: "AUTOTM_COMMIT_SHA" | "RAILWAY_ENVIRONMENT_NAME" | "APP_ENV",
  value: string | undefined,
) {
  if (!saved.has(name)) saved.set(name, process.env[name]);
  if (value === undefined) {
    Reflect.deleteProperty(process.env, name);
  } else {
    process.env[name] = value;
  }
}

afterEach(() => {
  for (const [name, value] of saved) {
    if (value === undefined) {
      Reflect.deleteProperty(process.env, name);
    } else {
      process.env[name] = value;
    }
  }
  saved.clear();
});

describe("web /healthz route", () => {
  it("returns a dependency-free ok payload", async () => {
    setEnv("AUTOTM_COMMIT_SHA", undefined);
    setEnv("RAILWAY_ENVIRONMENT_NAME", undefined);
    setEnv("APP_ENV", undefined);

    const response = GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "web",
      commitSha: "unknown",
      environment: "development",
    });
  });

  it("surfaces baked-in deploy evidence", async () => {
    setEnv("AUTOTM_COMMIT_SHA", "abc123def");
    setEnv("APP_ENV", "staging");
    setEnv("RAILWAY_ENVIRONMENT_NAME", undefined);

    await expect(GET().json()).resolves.toMatchObject({
      commitSha: "abc123def",
      environment: "staging",
    });
  });
});
