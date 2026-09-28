import { describe, expect, it, vi } from "vitest";

import type { DeletionApiContext } from "./account-deletion";
import {
  apiUrl,
  confirmAccountDeletion,
  firstForwardedIp,
  normalizePhoneInput,
  requestAccountDeletion,
} from "./account-deletion";

const BASE_URL = "https://api.test/api/v1";
const REQUEST_ID = "7b0c2f4e-6a0e-4f39-9c1b-2d3f4a5b6c7d";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function apiError(status: number, code: string, message: string): Response {
  return json(status, {
    statusCode: status,
    code,
    message,
    timestamp: "2026-09-28T10:00:00.000Z",
    requestId: REQUEST_ID,
  });
}

function context(fetchMock: typeof fetch, overrides: Partial<DeletionApiContext> = {}) {
  return {
    baseUrl: BASE_URL,
    locale: "tk" as const,
    clientIp: "203.0.113.7",
    fetch: fetchMock,
    ...overrides,
  };
}

function firstCall(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>) {
  const call = fetchMock.mock.calls[0];
  if (!call) throw new Error("the API was not called");
  return call;
}

const codeSent = () =>
  json(200, {
    requestId: "9f2d8c1a-3b4e-4c5d-8e6f-7a8b9c0d1e2f",
    resendInSeconds: 60,
  });

describe("normalizePhoneInput", () => {
  it.each([
    ["61234567", "+99361234567"],
    ["+993 61 23-45-67", "+99361234567"],
    ["99361234567", "+99361234567"],
    ["061234567", "+99361234567"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhoneInput(input)).toBe(expected);
  });
});

describe("apiUrl", () => {
  it.each([
    "https://api.test",
    "https://api.test/",
    "https://api.test/api/v1",
    "https://api.test/api/v1/",
  ])("adds the /api/v1 prefix once to %s", (base) => {
    expect(apiUrl(base, "/account-deletion/request")).toBe(
      "https://api.test/api/v1/account-deletion/request",
    );
  });
});

describe("firstForwardedIp", () => {
  it("takes the first X-Forwarded-For entry, like the API", () => {
    expect(firstForwardedIp("203.0.113.7, 10.0.0.1")).toBe("203.0.113.7");
    expect(firstForwardedIp(null)).toBeNull();
    expect(firstForwardedIp("  ")).toBeNull();
  });
});

describe("requestAccountDeletion", () => {
  it("posts the normalized phone with the visitor's IP and locale", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(codeSent());

    const result = await requestAccountDeletion("phone", "61 23-45-67", context(fetchMock));

    expect(result).toEqual({ ok: true, destination: "+99361234567", resendInSeconds: 60 });
    const [url, init] = firstCall(fetchMock);
    expect(url).toBe(`${BASE_URL}/account-deletion/request`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ phone: "+99361234567" });
    expect(init?.headers).toMatchObject({
      "Accept-Language": "tk",
      "X-Forwarded-For": "203.0.113.7",
    });
  });

  it("posts a trimmed, lowercased email", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(codeSent());

    const result = await requestAccountDeletion("email", "  Seller@Example.COM ", context(fetchMock));

    expect(result).toEqual({ ok: true, destination: "seller@example.com", resendInSeconds: 60 });
    expect(JSON.parse(String(firstCall(fetchMock)[1]?.body))).toEqual({
      email: "seller@example.com",
    });
  });

  it("omits X-Forwarded-For when the visitor's IP is unknown", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(codeSent());

    await requestAccountDeletion("phone", "61234567", context(fetchMock, { clientIp: null }));

    expect(firstCall(fetchMock)[1]?.headers).not.toHaveProperty("X-Forwarded-For");
  });

  it("never exposes a test code from the response", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      json(200, {
        requestId: "9f2d8c1a-3b4e-4c5d-8e6f-7a8b9c0d1e2f",
        resendInSeconds: 120,
        testCode: "123456",
      }),
    );

    const result = await requestAccountDeletion("phone", "61234567", context(fetchMock));

    expect(result).toEqual({ ok: true, destination: "+99361234567", resendInSeconds: 120 });
  });

  it.each([
    ["phone", "51234567"],
    ["phone", "6123"],
    ["email", "not-an-email"],
  ] as const)("rejects %s %s without calling the API", async (channel, value) => {
    const fetchMock = vi.fn<typeof fetch>();

    const result = await requestAccountDeletion(channel, value, context(fetchMock));

    expect(result).toEqual({ ok: false, error: "invalid-value" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [apiError(400, "RATE_LIMITED", "Too many code requests."), "rate-limited"],
    [
      json(429, {
        statusCode: 429,
        code: "HTTP_ERROR",
        message: "ThrottlerException: Too Many Requests",
        timestamp: "2026-09-28T10:00:00.000Z",
        requestId: REQUEST_ID,
      }),
      "rate-limited",
    ],
    [apiError(400, "VALIDATION_FAILED", "Invalid account deletion request"), "invalid-value"],
    [apiError(500, "INTERNAL", "Internal server error"), "unavailable"],
    [new Response("<html>Bad gateway</html>", { status: 502 }), "unavailable"],
    [json(200, { unexpected: true }), "unavailable"],
  ])("maps an API answer to a plain failure (%#)", async (response, error) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);

    const result = await requestAccountDeletion("phone", "61234567", context(fetchMock));

    expect(result).toEqual({ ok: false, error });
  });

  it("reports an unreachable API as unavailable", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));

    const result = await requestAccountDeletion("phone", "61234567", context(fetchMock));

    expect(result).toEqual({ ok: false, error: "unavailable" });
  });
});

describe("confirmAccountDeletion", () => {
  it("posts the destination and code and succeeds on 204", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));

    const result = await confirmAccountDeletion(
      "email",
      "seller@example.com",
      " 123456 ",
      context(fetchMock),
    );

    expect(result).toEqual({ ok: true });
    const [url, init] = firstCall(fetchMock);
    expect(url).toBe(`${BASE_URL}/account-deletion/confirm`);
    expect(JSON.parse(String(init?.body))).toEqual({
      email: "seller@example.com",
      code: "123456",
    });
  });

  it("returns one failure for every code the API refuses", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      apiError(400, "INVALID_OTP", "The code is wrong, expired, or already used."),
    );

    const result = await confirmAccountDeletion(
      "phone",
      "+99361234567",
      "000000",
      context(fetchMock),
    );

    expect(result).toEqual({ ok: false, error: "invalid-code" });
  });

  it.each(["12345", "12a456", ""])(
    "asks for six digits when the code is %j",
    async (code) => {
      const fetchMock = vi.fn<typeof fetch>();

      const result = await confirmAccountDeletion(
        "phone",
        "+99361234567",
        code,
        context(fetchMock),
      );

      expect(result).toEqual({ ok: false, error: "invalid-code-format" });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("rejects an invalid destination without calling the API", async () => {
    const fetchMock = vi.fn<typeof fetch>();

    const result = await confirmAccountDeletion("email", "nope", "123456", context(fetchMock));

    expect(result).toEqual({ ok: false, error: "invalid-value" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
