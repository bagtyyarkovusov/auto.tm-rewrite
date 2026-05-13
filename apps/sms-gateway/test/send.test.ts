import { describe, it, expect, beforeAll } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildApp } from "../src/server.js";

let app: FastifyInstance;

beforeAll(async () => {
  process.env.GATEWAY_TOKEN = "test-token-min-8-chars";
  const result = buildApp();
  app = result.app;
  await app.ready();
});

describe("POST /v1/send", () => {
  it("returns 401 when x-gateway-token header is missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/send",
      payload: { phone: "+99361234567", body: "test", requestId: "00000000-0000-0000-0000-000000000001" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns 400 with VALIDATION_FAILED when body is invalid", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/send",
      headers: { "x-gateway-token": "test-token-min-8-chars" },
      payload: { phone: "", body: "", requestId: "not-a-uuid" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("returns 202 with ok result when request is valid", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/send",
      headers: { "x-gateway-token": "test-token-min-8-chars" },
      payload: { phone: "+99361234567", body: "Your code: 123456", requestId: "00000000-0000-0000-0000-000000000001" },
    });

    expect(res.statusCode).toBe(202);
    const json = res.json();
    expect(json).toMatchObject({ ok: true });
    expect(json.messageId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
